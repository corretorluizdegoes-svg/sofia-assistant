import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Plus, Send, Trash2, BookOpen, User, Sparkles, MessageCircle, Network, Target,
  Package, Paperclip, Terminal, X, Pencil, Check,
} from "lucide-react";
import { gerarTituloDeMensagem, TITULO_CONVERSA_MAX } from "@/lib/titulo-conversa";
import { useTranslation } from "react-i18next";
import { useProgresso } from "@/hooks/useProgresso";
import { useToast } from "@/hooks/use-toast";
import { modulos, niveis } from "@/lib/sofia-data";
import { Conversa, Mensagem, useConversas } from "@/hooks/useConversas";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SofiaAvatarIcon, nivelIcon, moduloVisual } from "@/lib/sofia-icons";
import { useCurriculoI18n } from "@/i18n/curriculo";
import sofiaAvatarUrl from "@/assets/sofia-avatar.png";
import { useDevMode } from "@/hooks/useDevMode";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sofia-chat`;
const DEV_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sofia-dev-chat`;

type Props = {
  startMessage?: string | null;
  onConsumeStartMessage?: () => void;
};

// ===== Frases mágicas =====
// ATIVAR só faz sentido pra elevar Editor → Comandante. Mantemos a antiga
// "estou presente, estamos alinhados" como atalho legado, e adicionamos
// a oficial pedida pelo Luiz: "O Comando está no Centro."
const ATIVAR_FRASES = [
  "o comando está no centro",
  "estou presente, estamos alinhados",
];
const DESATIVAR = "comando devolvido ao centro";
const RITUAL_LINHAS = [
  "Pulso do Comandante Detectado.",
  "Assinatura Soberana validada, íntegra e ativa.",
  "Bem vindo Comandante Élion.",
];
const SAIDA_RITUAL = "Comando devolvido ao Centro. Sofia retorna ao Modo Editor.";

/** normaliza pra matching: lowercase, sem pontuação trailing, sem espaços extra */
function normalizarFrase(s: string): string {
  return s.toLowerCase().trim().replace(/[.!?,;:\s]+$/g, "").replace(/\s+/g, " ");
}

function timestampNome(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function ChatSofia({ startMessage, onConsumeStartMessage }: Props) {
  const { t, i18n } = useTranslation();
  const curr = useCurriculoI18n();
  const {
    conversas,
    conversaAtivaId,
    mensagens,
    loading: loadingConv,
    criarConversa,
    trocarConversa,
    apagarConversa,
    salvarMensagem,
    setMensagensLocal,
  } = useConversas();

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [aberturaFeita, setAberturaFeita] = useState(false);
  const [arquivoAnexado, setArquivoAnexado] = useState<{ nome: string; conteudo: string } | null>(null);
  const [gerandoPacote, setGerandoPacote] = useState(false);
  const [comandSheet, setComandSheet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { registrarInteracao, nivelAtual, xp, topicosExplorados, conquistas, totalMensagens } = useProgresso();
  const { toast } = useToast();
  const { user } = useAuth();
  const dev = useDevMode();

  // Conversa ativa é dev?
  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId);
  const ehSessaoDev = conversaAtiva?.is_dev_session === true;
  const conversasNormais = useMemo(() => conversas.filter((c) => !c.is_dev_session), [conversas]);
  const conversasDev = useMemo(() => conversas.filter((c) => c.is_dev_session), [conversas]);

  const mensagensExibidas: Mensagem[] = mensagens;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, isSending]);

  useEffect(() => {
    if (startMessage && !isSending && conversaAtivaId) {
      enviarTexto(startMessage);
      onConsumeStartMessage?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMessage, conversaAtivaId]);

  useEffect(() => {
    if (loadingConv || !conversaAtivaId || aberturaFeita || isSending) return;
    if (mensagens.length > 0) return;
    if (startMessage) return;
    if (ehSessaoDev) return; // dev sessions não disparam abertura pedagógica

    setAberturaFeita(true);
    const ehPrimeiroAcesso = (totalMensagens ?? 0) === 0;
    abrirConversa(ehPrimeiroAcesso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConv, conversaAtivaId, mensagens.length, aberturaFeita, isSending, startMessage, totalMensagens, ehSessaoDev]);

  useEffect(() => {
    setAberturaFeita(false);
  }, [conversaAtivaId]);

  function contextoAluno(): string {
    const moduloNomes = topicosExplorados
      .map((id) => modulos.find((m) => m.id === id)?.nome)
      .filter(Boolean)
      .join(", ");
    return [
      `Nível atual: ${nivelAtual.nome} (Lv ${nivelAtual.nivel}/10).`,
      `XP: ${xp}.`,
      moduloNomes ? `Módulos já tocados: ${moduloNomes}.` : "Ainda não tocou módulos específicos.",
      conquistas.length ? `Conquistas: ${conquistas.length}.` : "",
    ].filter(Boolean).join(" ");
  }

  // ============= STREAM SOFIA NORMAL =============
  async function streamResposta(
    historico: Mensagem[],
    opts?: { primeiroAcesso?: boolean; resumoAnterior?: string },
  ): Promise<string> {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: historico.map(({ role, content }) => ({ role, content })),
        contextoAluno: contextoAluno(),
        primeiroAcesso: opts?.primeiroAcesso ?? false,
        resumoAnterior: opts?.resumoAnterior ?? null,
        language: i18n.language,
      }),
    });
    return await consumirSSE(resp);
  }

  // ============= STREAM SOFIA DEV (Editor / Comandante) =============
  async function streamRespostaDev(historico: Mensagem[]): Promise<string> {
    const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
    const resp = await fetch(DEV_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken ?? ""}`,
      },
      body: JSON.stringify({
        mode: "chat",
        tier: dev.tier, // "editor" | "comandante"
        sessionId: conversaAtivaId,
        messages: historico.map(({ role, content }) => ({ role, content })),
      }),
    });
    return await consumirSSE(resp);
  }

  // ============= EXECUTOR DE AÇÕES CONFIRMADAS =============
  // Quando a Sofia emite ```action {...}``` E o usuário responde "sim, confirmo",
  // chamamos a edge com mode=execute pra aplicar a mudança no banco.
  async function tentarExecutarAcaoConfirmada(textoUsuario: string): Promise<boolean> {
    if (!dev.editorAtivo) return false;
    const confirma = /^\s*(sim,?\s*confirmo|confirmo|sim|pode aplicar)\s*\.?\s*$/i.test(textoUsuario.trim());
    if (!confirma) return false;

    // procura a ÚLTIMA mensagem assistant com bloco ```action ... ```
    const ultimaAssistente = [...mensagens].reverse().find((m) => m.role === "assistant");
    if (!ultimaAssistente) return false;
    const match = ultimaAssistente.content.match(/```action\s*([\s\S]*?)```/i);
    if (!match) return false;

    let action: { op: string; payload: Record<string, unknown> };
    try {
      action = JSON.parse(match[1].trim());
    } catch (e) {
      console.warn("[exec] JSON inválido no bloco action:", e);
      return false;
    }

    const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
    try {
      const resp = await fetch(DEV_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken ?? ""}` },
        body: JSON.stringify({ mode: "execute", tier: dev.tier, action, sessionId: conversaAtivaId }),
      });
      const data = await resp.json();
      const ok = resp.ok && data?.ok;
      const aviso = ok
        ? `// Ação executada: ${data.message}`
        : `// FALHA na execução: ${data?.message ?? `HTTP ${resp.status}`}`;
      const msg: Mensagem = { role: "assistant", content: aviso };
      setMensagensLocal((prev) => [...prev, msg]);
      await salvarMensagem(msg);
      toast({
        title: ok ? "Mudança aplicada" : "Falha na execução",
        description: data?.message ?? "",
      });
      return true;
    } catch (e) {
      console.error("[exec] erro:", e);
      return false;
    }
  }

  async function consumirSSE(resp: Response): Promise<string> {
    if (resp.status === 429) {
      toast({ title: t("chat.rateLimit"), description: t("chat.rateLimitDesc") });
      throw new Error("rate_limit");
    }
    if (resp.status === 402) {
      toast({ title: t("chat.creditsOut"), description: t("chat.creditsOutDesc") });
      throw new Error("payment_required");
    }
    if (resp.status === 403) {
      toast({ title: "Acesso negado", description: "Sessão inválida pro Modo Comandante." });
      throw new Error("forbidden");
    }
    if (!resp.ok || !resp.body) throw new Error("Falha ao iniciar o stream");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let acumulado = "";
    let assistantInserido = false;

    const empurrar = (chunk: string) => {
      acumulado += chunk;
      setMensagensLocal((prev) => {
        if (!assistantInserido) {
          assistantInserido = true;
          return [...prev, { role: "assistant", content: acumulado }];
        }
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acumulado } : m));
      });
    };

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, nl);
        textBuffer = textBuffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) empurrar(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
    return acumulado;
  }

  async function buscarResumoAnterior(): Promise<string | null> {
    if (!user || !conversaAtivaId) return null;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, title, disciplina, is_dev_session")
      .eq("user_id", user.id)
      .eq("is_dev_session", false)
      .neq("id", conversaAtivaId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const anterior = convs?.[0];
    if (!anterior) return null;

    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", anterior.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (!msgs || msgs.length === 0) return null;
    const trecho = msgs
      .reverse()
      .map((m) => `${m.role === "user" ? "Aluno" : "S.O.F.I.A."}: ${m.content.slice(0, 280)}`)
      .join("\n");
    const cabecalho = anterior.disciplina
      ? `Última conversa foi sobre "${anterior.disciplina}". `
      : `Última conversa: "${anterior.title}". `;
    return cabecalho + "Trechos recentes:\n" + trecho;
  }

  async function abrirConversa(ehPrimeiroAcesso: boolean) {
    if (!conversaAtivaId) return;
    setIsSending(true);
    try {
      let resumo: string | null = null;
      if (!ehPrimeiroAcesso) resumo = await buscarResumoAnterior();
      const respostaCompleta = await streamResposta([], {
        primeiroAcesso: ehPrimeiroAcesso || !resumo,
        resumoAnterior: resumo ?? undefined,
      });
      if (respostaCompleta.trim()) {
        await salvarMensagem({ role: "assistant", content: respostaCompleta });
      }
    } catch (err) {
      console.error("abrirConversa error:", err);
    } finally {
      setIsSending(false);
    }
  }

  // ============= ATIVAÇÃO / DESATIVAÇÃO RITUAL =============
  async function tratarFraseMagica(textoOriginal: string): Promise<boolean> {
    const norm = normalizarFrase(textoOriginal);
    // Ativação — eleva Editor → Comandante. Só funciona se for admin.
    if (ATIVAR_FRASES.includes(norm) && !dev.comandanteAtivo) {
      if (!dev.isAdmin) return false; // ignora silenciosamente, vira mensagem normal
      const userMsg: Mensagem = { role: "user", content: textoOriginal };
      setMensagensLocal((prev) => [...prev, userMsg]);
      setInput("");
      await salvarMensagem(userMsg);
      const resposta = RITUAL_LINHAS.join("\n");
      setMensagensLocal((prev) => [...prev, { role: "assistant", content: resposta }]);
      await salvarMensagem({ role: "assistant", content: resposta });
      dev.activate();
      return true;
    }
    // Desativação — só processa se já estiver ativo
    if (norm === DESATIVAR && dev.comandanteAtivo) {
      const userMsg: Mensagem = { role: "user", content: textoOriginal };
      setMensagensLocal((prev) => [...prev, userMsg]);
      setInput("");
      await salvarMensagem(userMsg);
      setMensagensLocal((prev) => [...prev, { role: "assistant", content: SAIDA_RITUAL }]);
      await salvarMensagem({ role: "assistant", content: SAIDA_RITUAL });
      dev.deactivate();
      return true;
    }
    return false;
  }

  // ============= ENVIO PRINCIPAL =============
  async function enviarTexto(texto: string) {
    if (!texto || isSending || !conversaAtivaId) return;

    // 1. Frases mágicas têm prioridade absoluta (eleva pra Comandante)
    const tratado = await tratarFraseMagica(texto);
    if (tratado) return;

    // 2. Em sessão dev, "sim, confirmo" pode aplicar a última ação proposta pela Sofia
    if (ehSessaoDev) {
      const userMsg: Mensagem = { role: "user", content: texto };
      const executou = await tentarExecutarAcaoConfirmada(texto);
      if (executou) {
        setMensagensLocal((prev) => [...prev, userMsg]);
        setInput("");
        await salvarMensagem(userMsg);
        return;
      }
    }

    // 3. Monta envelope com arquivo anexado se houver
    let conteudoFinal = texto;
    if (arquivoAnexado && dev.editorAtivo) {
      conteudoFinal = `[ARQUIVO ANEXADO: ${arquivoAnexado.nome}]\n\n${arquivoAnexado.conteudo}\n\n[FIM DO ARQUIVO]\n\n${texto}`;
    }

    const userMsg: Mensagem = { role: "user", content: conteudoFinal };
    const historicoCompleto: Mensagem[] = [...mensagens, userMsg];

    setMensagensLocal((prev) => [...prev, userMsg]);
    setInput("");
    setArquivoAnexado(null);
    setIsSending(true);

    await salvarMensagem(userMsg);

    // Sessão dev: NÃO conta XP, NÃO detecta módulos
    if (!ehSessaoDev) {
      const resultado = await registrarInteracao(texto);
      if (resultado.modulosDetectados.length >= 2) {
        const nomes = resultado.modulosDetectados
          .map((id) => curr.moduloNome(id, modulos.find((m) => m.id === id)?.nome ?? id))
          .filter(Boolean)
          .slice(0, 3)
          .join(" • ");
        toast({
          title: t("chat.nonLinearTitle"),
          description: nomes ? t("chat.nonLinearDesc", { names: nomes }) : undefined,
        });
      }
      if (resultado.novoNivel) {
        const novo = niveis.find((n) => n.nivel === resultado.levelAtual);
        if (novo) {
          toast({ title: t("chat.newHorizon", { name: curr.nivelNome(novo.nome) }), description: novo.descricao });
        }
      }
    }

    try {
      const resposta = ehSessaoDev
        ? await streamRespostaDev(historicoCompleto)
        : await streamResposta(historicoCompleto);
      if (resposta.trim()) {
        await salvarMensagem({ role: "assistant", content: resposta });
      }
    } catch (err) {
      console.error(err);
      setMensagensLocal((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === "") return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setIsSending(false);
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    await enviarTexto(input.trim());
  }

  // ============= NOVA CONVERSA — admin sempre cria dev session =============
  async function novaConversa() {
    if (dev.editorAtivo) {
      const titulo = dev.comandanteAtivo ? "Sessão de Comando" : "Sessão Editor";
      await criarConversa({ title: titulo, is_dev_session: true });
    } else {
      await criarConversa();
    }
  }

  // ============= UPLOAD DE ARQUIVO (modo dev) =============
  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const ext = f.name.toLowerCase().split(".").pop() ?? "";
    const okExt = ["json", "txt", "md"].includes(ext);
    const okMime = /^(application\/json|text\/(plain|markdown|x-markdown))$/i.test(f.type) || f.type === "";
    if (!okExt || !okMime) {
      toast({ title: "Formato inválido", description: "Apenas .json, .txt ou .md." });
      return;
    }
    if (f.size > 500 * 1024) {
      toast({ title: "Arquivo grande demais", description: "Máximo 500KB." });
      return;
    }
    const conteudo = await f.text();
    setArquivoAnexado({ nome: f.name, conteudo });
    toast({ title: "Arquivo anexado", description: f.name });
  }

  // ============= GERAR PACOTE =============
  async function gerarPacote() {
    if (!conversaAtivaId || gerandoPacote) return;
    if (mensagens.length < 2) {
      toast({ title: "Sessão muito curta", description: "Converse um pouco antes de gerar o pacote." });
      return;
    }
    setGerandoPacote(true);
    try {
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      const resp = await fetch(DEV_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken ?? ""}`,
        },
        body: JSON.stringify({
          mode: "synthesize",
          sessionId: conversaAtivaId,
          messages: mensagens.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error("[gerarPacote] erro", resp.status, t);
        toast({ title: "Falha na síntese", description: `HTTP ${resp.status}` });
        return;
      }
      const data = await resp.json();
      const ts = timestampNome();
      baixarBlob(`sofia_brief_${ts}.txt`, "text/plain;charset=utf-8", data.brief_txt ?? "");
      baixarBlob(
        `sofia_changes_${ts}.json`,
        "application/json;charset=utf-8",
        JSON.stringify(data.changes_json ?? {}, null, 2),
      );
      toast({
        title: "Pacote gerado",
        description: "Comandante, o sistema aguarda suas decisões.",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro inesperado", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setGerandoPacote(false);
    }
  }

  function baixarBlob(nome: string, mime: string, conteudo: string) {
    const blob = new Blob([conteudo], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const NivelIcon = nivelIcon(nivelAtual.nivel);

  return (
    <section className="flex-1 min-w-0 flex flex-col h-full glass-strong rounded-3xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <div className="relative">
          <img
            src={sofiaAvatarUrl}
            alt="S.O.F.I.A."
            className="w-11 h-11 rounded-2xl object-cover shadow-soft ring-1 ring-primary/20"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent border-2 border-card animate-pulse-soft" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to="/saiba-mais"
            className="inline-block hover:opacity-80 transition-opacity"
            title="Saiba mais sobre a S.O.F.I.A."
          >
            <h1 className="font-display font-bold text-lg leading-tight text-foreground tracking-tight hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2">
              S.O.F.I.A.
              {dev.editorAtivo && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest animate-pulse-soft ${
                    dev.comandanteAtivo ? "tone-violet" : "bg-violet-50 text-violet-700 border border-violet-200"
                  }`}
                >
                  <Terminal className="w-2.5 h-2.5" strokeWidth={2.5} />
                  {dev.comandanteAtivo ? "MODO COMANDANTE" : "MODO EDITOR"}
                </span>
              )}
            </h1>
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            Sistema Orientado ao Fluxo Integrado de Aprendizado
          </p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full tone-blue px-2.5 py-1 text-xs font-semibold">
          <NivelIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
          {nivelAtual.nome}
        </div>
        {dev.editorAtivo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={gerarPacote}
            disabled={gerandoPacote}
            className="rounded-full text-violet-600 hover:bg-violet-50"
            title="Gerar Pacote (brief + changes.json)"
          >
            <Package className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline text-xs">{gerandoPacote ? "Gerando…" : "Gerar Pacote"}</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={novaConversa}
          className="rounded-full text-slate-500 hover:text-primary hover:bg-primary/5"
          title={dev.editorAtivo ? (dev.comandanteAtivo ? "Nova Sessão de Comando" : "Nova Sessão Editor") : t("chat.new")}
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span className="hidden sm:inline text-xs">{t("chat.new")}</span>
        </Button>
      </header>

      {/* Lista de conversas — só normais por padrão. Dev sessions ficam num drawer separado pro admin. */}
      {(conversasNormais.length > 0 || (dev.isAdmin && conversasDev.length > 0)) && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40 bg-white/30 overflow-x-auto scrollbar-soft">
          {conversasNormais.map((c: Conversa) => {
            const ativa = c.id === conversaAtivaId;
            return (
              <div
                key={c.id}
                className={`group flex items-center gap-1 shrink-0 rounded-full text-xs transition-all ${
                  ativa
                    ? "bg-gradient-primary text-white shadow-soft"
                    : "bg-white/70 text-foreground/70 hover:bg-white"
                }`}
              >
                <button
                  onClick={() => trocarConversa(c.id)}
                  className="px-3 py-1.5 max-w-[180px] truncate inline-flex items-center gap-1.5"
                  title={c.title}
                >
                  {c.disciplina && <BookOpen className="w-3 h-3" strokeWidth={1.75} />}
                  {c.disciplina ? curr.disciplinaNome(c.disciplina) : c.title}
                </button>
                {ativa && conversasNormais.length > 1 && (
                  <button
                    onClick={() => apagarConversa(c.id)}
                    className="pr-2 opacity-70 hover:opacity-100"
                    aria-label={t("chat.deleteAria")}
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            );
          })}
          {dev.isAdmin && conversasDev.length > 0 && (
            <button
              onClick={() => setComandSheet((v) => !v)}
              className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full tone-violet px-3 py-1.5 text-xs font-semibold"
              title="Sessões de Comando"
            >
              <Terminal className="w-3 h-3" strokeWidth={2} />
              Sessões de Comando ({conversasDev.length})
            </button>
          )}
        </div>
      )}

      {/* Drawer de sessões de comando */}
      {dev.isAdmin && comandSheet && (
        <div className="border-b border-violet-200/60 bg-violet-50/40 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-soft">
          <span className="shrink-0 text-[10px] tracking-widest text-violet-700/80 font-bold pr-1">SESSÕES</span>
          {conversasDev.map((c) => {
            const ativa = c.id === conversaAtivaId;
            return (
              <div
                key={c.id}
                className={`group flex items-center gap-1 shrink-0 rounded-full text-xs ${
                  ativa
                    ? "bg-violet-600 text-white shadow-soft"
                    : "bg-white/80 text-violet-800 border border-violet-200 hover:bg-white"
                }`}
              >
                <button
                  onClick={() => trocarConversa(c.id)}
                  className="px-3 py-1.5 max-w-[200px] truncate inline-flex items-center gap-1.5"
                  title={c.title}
                >
                  <Terminal className="w-3 h-3" strokeWidth={2} />
                  {c.title}
                </button>
                {ativa && (
                  <button
                    onClick={() => apagarConversa(c.id)}
                    className="pr-2 opacity-70 hover:opacity-100"
                    aria-label="Apagar sessão"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-soft px-4 sm:px-8 py-6 space-y-5">
        {loadingConv ? (
          <div className="text-center text-sm text-muted-foreground">{t("chat.loading")}</div>
        ) : mensagensExibidas.length === 0 && !isSending ? (
          ehSessaoDev
            ? <DevWelcome tier={dev.tier} />
            : <WelcomeCards onPick={(msg) => enviarTexto(msg)} />
        ) : (
          mensagensExibidas.map((m, i) => <MessageBubble key={m.id ?? i} msg={m} />)
        )}
        {isSending && mensagensExibidas[mensagensExibidas.length - 1]?.role === "user" && (
          <div className="flex items-end gap-3 animate-fade-in">
            <img
              src={sofiaAvatarUrl}
              alt="S.O.F.I.A."
              className="w-9 h-9 rounded-full object-cover shadow-soft shrink-0 ring-1 ring-primary/20"
              loading="lazy"
            />
            <div className="bg-white/90 border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-soft">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Anexo preview */}
      {arquivoAnexado && dev.editorAtivo && (
        <div className="mx-4 mb-2 rounded-xl bg-violet-50 border border-violet-200 px-3 py-2 flex items-center gap-2 text-xs text-violet-800">
          <Paperclip className="w-3.5 h-3.5" />
          <span className="flex-1 truncate font-mono">{arquivoAnexado.nome}</span>
          <button
            onClick={() => setArquivoAnexado(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Remover anexo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input flutuante */}
      <form onSubmit={enviar} className="px-3 sm:px-4 pb-4 pt-2">
        <div
          className={`flex items-end gap-2 bg-white rounded-full border focus-within:shadow-glow shadow-soft transition-all pl-5 pr-2 py-2 ${
            dev.editorAtivo
              ? "border-violet-300 ring-1 ring-[hsl(var(--primary-glow))]/40 focus-within:border-violet-400"
              : "border-border/70 focus-within:border-primary/50"
          }`}
        >
          {dev.editorAtivo && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,.md,application/json,text/plain,text/markdown"
                onChange={handleArquivo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Anexar .json, .txt ou .md (max 500KB)"
                className="shrink-0 w-9 h-9 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 flex items-center justify-center transition-colors"
              >
                <Paperclip className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(e as unknown as FormEvent);
              }
            }}
            rows={1}
            disabled={isSending || loadingConv}
            placeholder={dev.comandanteAtivo ? "modo comandante — fale técnico" : t("chat.placeholder")}
            className="flex-1 resize-none bg-transparent outline-none text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 max-h-40 py-2"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className={`shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center shadow-soft hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 ${
              dev.editorAtivo ? "bg-violet-600 hover:bg-violet-700" : "bg-gradient-primary"
            }`}
            aria-label={t("common.send")}
          >
            <Send className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/80 text-center">
          {dev.comandanteAtivo
            ? "Modo Comandante ativo — Sofia te chama de Comandante Élion. Sessões não contam XP."
            : dev.editorAtivo
              ? 'Modo Editor ativo — Sofia pode editar nodes/conexões após "sim, confirmo". Diga "O Comando está no Centro." para ativar o Comandante.'
              : t("chat.footer")}
        </p>
      </form>
    </section>
  );
}

function DevWelcome({ tier }: { tier: "editor" | "comandante" }) {
  const ehComandante = tier === "comandante";
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-6 animate-fade-in text-center">
      <div
        className={`w-14 h-14 rounded-3xl mx-auto mb-4 flex items-center justify-center ${
          ehComandante ? "tone-violet" : "bg-violet-50 text-violet-700 border border-violet-200"
        }`}
      >
        <Terminal className="w-6 h-6" strokeWidth={2} />
      </div>
      <h2 className="font-display font-bold text-2xl text-foreground tracking-tight mb-2">
        {ehComandante ? "Modo Comandante" : "Modo Editor"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {ehComandante ? (
          <>
            Sofia te trata por <strong>Comandante Élion</strong>. Análise estratégica
            ativa — convoque um Núcleo (Matemático, Computacional, IA, Simbólico, Quântico)
            quando precisar de suporte tático.
          </>
        ) : (
          <>
            Sofia em modo editora técnica. Pode inspecionar e editar nodes/conexões
            do mapa mental — sempre pede <em>"sim, confirmo"</em> antes de aplicar.
            Diga <em>"O Comando está no Centro."</em> para elevar ao Modo Comandante.
          </>
        )}
      </p>
    </div>
  );
}

function WelcomeCards({ onPick }: { onPick: (msg: string) => void }) {
  const { t } = useTranslation();
  const cards = [
    {
      icon: BookOpen,
      title: t("welcome.exploreSubject", "Explorar uma matéria"),
      desc: t("welcome.exploreSubjectDesc", "Mergulhe em um tema do currículo"),
      message: t("welcome.exploreSubjectMsg", "Quero explorar uma matéria. Pode me sugerir por onde começar?"),
      tone: "from-primary/20 to-primary/5",
    },
    {
      icon: MessageCircle,
      title: t("welcome.freeChat", "Conversar livremente"),
      desc: t("welcome.freeChatDesc", "Pergunte qualquer coisa que esteja na sua mente"),
      message: t("welcome.freeChatMsg", "Oi S.O.F.I.A., quero só conversar e pensar em voz alta hoje."),
      tone: "from-accent/20 to-accent/5",
    },
    {
      icon: Network,
      title: t("welcome.viewMap", "Ver meu Mapa Mental"),
      desc: t("welcome.viewMapDesc", "Veja como suas ideias se conectam"),
      message: t("welcome.viewMapMsg", "Me mostra o que já construí no meu Mapa Mental até agora."),
      tone: "from-purple-400/20 to-purple-400/5",
    },
    {
      icon: Target,
      title: t("welcome.dailyMission", "Missão diária"),
      desc: t("welcome.dailyMissionDesc", "Receba um desafio rápido para hoje"),
      message: t("welcome.dailyMissionMsg", "Me dá uma missão rápida para eu fazer hoje."),
      tone: "from-amber-400/20 to-amber-400/5",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-6 animate-fade-in">
      <div className="text-center mb-8 max-w-md">
        <div className="w-14 h-14 rounded-3xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
          <Sparkles className="w-6 h-6 text-white" strokeWidth={1.75} />
        </div>
        <h2 className="font-display font-bold text-2xl text-foreground tracking-tight mb-2">
          {t("welcome.title", "Por onde quer começar?")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("welcome.subtitle", "Escolha um caminho ou simplesmente comece a digitar.")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.title}
              onClick={() => onPick(c.message)}
              className={`group relative text-left p-4 rounded-2xl bg-gradient-to-br ${c.tone} border border-border/60 hover:border-primary/40 hover:shadow-soft transition-all hover:-translate-y-0.5`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-soft group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">{c.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Mensagem }) {
  const isUser = msg.role === "user";
  // Detecta resposta ritual de ativação para tratamento especial
  const ehRitual = !isUser && RITUAL_LINHAS.every((l) => msg.content.includes(l));

  if (ehRitual) {
    return (
      <div className="flex items-end gap-3 animate-fade-in">
        <img
          src={sofiaAvatarUrl}
          alt="S.O.F.I.A."
          className="w-9 h-9 rounded-full object-cover shadow-soft shrink-0 ring-1 ring-primary/20"
          loading="lazy"
        />
        <div className="max-w-[80%] rounded-3xl rounded-bl-md px-5 py-4 shadow-elevated glass-strong border border-violet-200/60">
          {RITUAL_LINHAS.map((linha, i) => (
            <p
              key={i}
              className="text-sm sm:text-[15px] leading-relaxed font-medium opacity-0 animate-fade-in"
              style={{ animationDelay: `${i * 300}ms`, animationFillMode: "forwards" }}
            >
              {linha.includes("Comandante Élion") ? (
                <>
                  {linha.split("Comandante Élion")[0]}
                  <span className="text-gradient-primary font-bold">Comandante Élion</span>
                  {linha.split("Comandante Élion")[1]}
                </>
              ) : (
                linha
              )}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-3 animate-fade-in ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <img
          src={sofiaAvatarUrl}
          alt="S.O.F.I.A."
          className="w-9 h-9 rounded-full object-cover shadow-soft shrink-0 ring-1 ring-primary/20"
          loading="lazy"
        />
      )}
      <div
        className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm sm:text-[15px] leading-relaxed shadow-soft ${
          isUser
            ? "bg-gradient-primary text-white rounded-br-md"
            : "bg-white text-foreground border border-border/60 rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed prose-strong:text-primary prose-headings:text-foreground prose-li:my-0.5">
            <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-white border border-border flex items-center justify-center shadow-soft shrink-0">
          <User className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
