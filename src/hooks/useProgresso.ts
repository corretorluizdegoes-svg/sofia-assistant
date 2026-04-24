import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  niveis,
  patentes,
  patenteDoLevel,
  palavrasChavePorModulo,
  conquistasDisponiveis,
  type Patente,
  type Nivel,
} from "@/lib/sofia-data";

export type ProgressoEstado = {
  xp: number;
  topicosExplorados: string[];
  conquistas: string[];
  totalMensagens: number;
  streakDias: number;
  dataAlistamento: string | null;
};

const STORAGE_KEY = "sofia.progresso.v1";
const MIGRATED_KEY = "sofia.progresso.migrated";

const estadoInicial: ProgressoEstado = {
  xp: 0,
  topicosExplorados: [],
  conquistas: [],
  totalMensagens: 0,
  streakDias: 0,
  dataAlistamento: null,
};

// Tabela de XP/level (mantida em sincronia com SQL `xp_para_level`)
const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3300] as const;

function levelFromXp(xp: number): number {
  let lv = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) lv = i + 1;
  }
  return lv;
}

export function nivelAtualPorXp(xp: number): Nivel {
  const lv = levelFromXp(xp);
  return niveis.find((n) => n.nivel === lv) ?? niveis[0];
}

export function proximoNivelPorXp(xp: number): Nivel | null {
  const lv = levelFromXp(xp);
  if (lv >= 10) return null;
  return niveis.find((n) => n.nivel === lv + 1) ?? null;
}

function carregarLocal(): Pick<ProgressoEstado, "xp" | "topicosExplorados" | "conquistas" | "totalMensagens"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      xp: parsed.xp ?? 0,
      topicosExplorados: parsed.topicosExplorados ?? [],
      conquistas: parsed.conquistas ?? [],
      totalMensagens: parsed.totalMensagens ?? 0,
    };
  } catch {
    return null;
  }
}

function detectarModulos(texto: string): string[] {
  const t = texto.toLowerCase();
  const found: string[] = [];
  for (const [moduloId, palavras] of Object.entries(palavrasChavePorModulo)) {
    if (palavras.some((p) => t.includes(p))) found.push(moduloId);
  }
  return found;
}

// XP fixo por tipo de ação (Fase 1 - sugestão padrão aprovada pelo usuário)
const XP_POR_ACAO = {
  mensagem: 2,
  no_criado: 10,
  conexao_criada: 15,
  conversa_nova: 5,
} as const;

export type AcaoXP = keyof typeof XP_POR_ACAO;

export function useProgresso() {
  const { user } = useAuth();
  const [estado, setEstado] = useState<ProgressoEstado>(estadoInicial);
  const [carregado, setCarregado] = useState(false);

  // Carrega do banco + migra localStorage no primeiro login
  useEffect(() => {
    if (!user) {
      setEstado(estadoInicial);
      setCarregado(false);
      return;
    }
    let cancel = false;

    (async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("xp, topicos_explorados, conquistas, total_mensagens, streak_dias, data_alistamento")
        .eq("user_id", user.id)
        .maybeSingle();

      let inicial: ProgressoEstado = data
        ? {
            xp: data.xp ?? 0,
            topicosExplorados: data.topicos_explorados ?? [],
            conquistas: data.conquistas ?? [],
            totalMensagens: data.total_mensagens ?? 0,
            streakDias: (data as { streak_dias?: number }).streak_dias ?? 0,
            dataAlistamento: (data as { data_alistamento?: string }).data_alistamento ?? null,
          }
        : estadoInicial;

      // Migração one-shot do localStorage antigo
      const jaMigrou = localStorage.getItem(MIGRATED_KEY) === user.id;
      if (!jaMigrou) {
        const local = carregarLocal();
        if (local && local.xp > inicial.xp) {
          inicial = {
            ...inicial,
            xp: local.xp,
            topicosExplorados: Array.from(new Set([...inicial.topicosExplorados, ...local.topicosExplorados])),
            conquistas: Array.from(new Set([...inicial.conquistas, ...local.conquistas])),
            totalMensagens: Math.max(inicial.totalMensagens, local.totalMensagens),
          };
          await supabase.from("user_progress").upsert(
            {
              user_id: user.id,
              xp: inicial.xp,
              topicos_explorados: inicial.topicosExplorados,
              conquistas: inicial.conquistas,
              total_mensagens: inicial.totalMensagens,
            },
            { onConflict: "user_id" },
          );
        }
        localStorage.setItem(MIGRATED_KEY, user.id);
        localStorage.removeItem(STORAGE_KEY);
      }

      if (!cancel) {
        setEstado(inicial);
        setCarregado(true);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [user]);

  const nivelAtual = useMemo(() => nivelAtualPorXp(estado.xp), [estado.xp]);
  const patenteAtual: Patente = useMemo(() => patenteDoLevel(nivelAtual.nivel), [nivelAtual.nivel]);
  const proximo = useMemo(() => proximoNivelPorXp(estado.xp), [estado.xp]);
  const isMaxLevel = nivelAtual.nivel >= 10;

  const progressoAteProximo = useMemo(() => {
    if (!proximo) return 100;
    const base = nivelAtual.xpNecessario;
    const span = proximo.xpNecessario - base;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((estado.xp - base) / span) * 100));
  }, [estado.xp, nivelAtual, proximo]);

  /** Chama o RPC `registrar_xp` (atomic + streak). */
  const ganharXP = useCallback(
    async (tipo: AcaoXP, metadata: Record<string, unknown> = {}) => {
      if (!user) return null;
      const xp = XP_POR_ACAO[tipo];
      const { data, error } = await supabase.rpc("registrar_xp", {
        _tipo: tipo,
        _xp: xp,
        _metadata: metadata as never,
      });
      if (error) {
        console.error("registrar_xp error", error);
        return null;
      }
      const r = data as {
        xp_total: number;
        xp_ganho: number;
        bonus_streak: number;
        level: number;
        level_anterior: number;
        subiu_de_level: boolean;
        streak_dias: number;
      };
      setEstado((prev) => ({
        ...prev,
        xp: r.xp_total,
        streakDias: r.streak_dias,
      }));
      return r;
    },
    [user],
  );

  /** Mantém compat: continua sendo chamado pelo Chat. Agora apenas mensagens, e via RPC. */
  const registrarInteracao = useCallback(
    async (mensagemUsuario: string) => {
      const texto = mensagemUsuario.trim();
      const modulosDetectados = detectarModulos(texto);

      const r = await ganharXP("mensagem", { tamanho: texto.length, modulos: modulosDetectados });

      // Lado local: tópicos + conquistas legadas + total_mensagens
      const topicos = Array.from(new Set([...estado.topicosExplorados, ...modulosDetectados]));
      const totalMsg = estado.totalMensagens + 1;

      const conquistas = new Set(estado.conquistas);
      if (totalMsg === 1) conquistas.add("primeira_pergunta");
      if (topicos.length >= 3) conquistas.add("tres_topicos");
      if (modulosDetectados.length >= 2) conquistas.add("conexao_entre_areas");
      if (totalMsg >= 12) conquistas.add("sessao_profunda");
      if (r?.subiu_de_level) conquistas.add("subiu_nivel");

      const novasConquistas = Array.from(conquistas).filter((c) => !estado.conquistas.includes(c));

      const novoEstado: ProgressoEstado = {
        ...estado,
        xp: r?.xp_total ?? estado.xp,
        topicosExplorados: topicos,
        conquistas: Array.from(conquistas),
        totalMensagens: totalMsg,
        streakDias: r?.streak_dias ?? estado.streakDias,
      };
      setEstado(novoEstado);

      if (user) {
        await supabase
          .from("user_progress")
          .update({
            topicos_explorados: novoEstado.topicosExplorados,
            conquistas: novoEstado.conquistas,
            total_mensagens: novoEstado.totalMensagens,
          })
          .eq("user_id", user.id);
      }

      return {
        xpGanho: r?.xp_ganho ?? 0,
        novoNivel: r?.subiu_de_level ?? false,
        novasConquistas,
        modulosDetectados,
        levelAtual: r?.level ?? nivelAtual.nivel,
      };
    },
    [estado, user, ganharXP, nivelAtual.nivel],
  );

  return {
    ...estado,
    carregado,
    nivelAtual,
    patenteAtual,
    isMaxLevel,
    proximoNivel: proximo,
    progressoAteProximo,
    registrarInteracao,
    ganharXP,
    todasConquistas: conquistasDisponiveis,
    todasPatentes: patentes,
  };
}
