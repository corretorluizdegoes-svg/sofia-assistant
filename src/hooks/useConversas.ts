import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Conversa = {
  id: string;
  title: string;
  disciplina: string | null;
  modulo_id: string | null;
  updated_at: string;
  is_dev_session?: boolean;
};

export type Mensagem = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type CriarOpts = {
  title?: string;
  disciplina?: string;
  modulo_id?: string;
  is_dev_session?: boolean;
};

export function useConversas() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarConversas = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, disciplina, modulo_id, updated_at, is_dev_session")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setConversas((data as Conversa[]) ?? []);
    return data as Conversa[] | null;
  }, [user]);

  const carregarMensagens = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMensagens(((data as Mensagem[]) ?? []).filter((m) => m.role !== "system" as never));
  }, []);

  useEffect(() => {
    if (!user) {
      setConversas([]);
      setConversaAtivaId(null);
      setMensagens([]);
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      const lista = await carregarConversas();
      if (cancel) return;
      // Sempre abre a conversa NORMAL mais recente (ignora dev sessions na abertura).
      const primeiraNormal = (lista ?? []).find((c) => !c.is_dev_session);
      if (primeiraNormal) {
        setConversaAtivaId(primeiraNormal.id);
        await carregarMensagens(primeiraNormal.id);
      } else {
        const { data: nova } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: "Nova conversa" })
          .select()
          .single();
        if (nova) {
          setConversas([nova as Conversa]);
          setConversaAtivaId(nova.id);
          setMensagens([]);
        }
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [user, carregarConversas, carregarMensagens]);

  const criarConversa = useCallback(
    async (opts?: CriarOpts) => {
      if (!user) return null;
      const isDev = opts?.is_dev_session === true;
      const { data } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: opts?.title ?? (isDev ? "Sessão de Comando" : "Nova conversa"),
          disciplina: opts?.disciplina ?? null,
          modulo_id: opts?.modulo_id ?? null,
          is_dev_session: isDev,
        })
        .select()
        .single();
      if (data) {
        setConversas((prev) => [data as Conversa, ...prev]);
        setConversaAtivaId(data.id);
        setMensagens([]);
        // XP só pra conversas normais — dev sessions não contam.
        if (!isDev) {
          void supabase.rpc("registrar_xp", {
            _tipo: "conversa_nova",
            _xp: 5,
            _metadata: { conversation_id: data.id } as never,
          });
        }
      }
      return data as Conversa | null;
    },
    [user],
  );

  const trocarConversa = useCallback(
    async (id: string) => {
      setConversaAtivaId(id);
      await carregarMensagens(id);
    },
    [carregarMensagens],
  );

  const renomearConversa = useCallback(async (id: string, title: string) => {
    await supabase.from("conversations").update({ title }).eq("id", id);
    setConversas((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const apagarConversa = useCallback(
    async (id: string) => {
      await supabase.from("conversations").delete().eq("id", id);
      setConversas((prev) => prev.filter((c) => c.id !== id));
      if (conversaAtivaId === id) {
        const restante = conversas.filter((c) => c.id !== id);
        const proxima = restante.find((c) => !c.is_dev_session) ?? restante[0];
        if (proxima) {
          setConversaAtivaId(proxima.id);
          await carregarMensagens(proxima.id);
        } else {
          setConversaAtivaId(null);
          setMensagens([]);
        }
      }
    },
    [conversaAtivaId, conversas, carregarMensagens],
  );

  const salvarMensagem = useCallback(
    async (msg: Mensagem) => {
      if (!user || !conversaAtivaId) return;
      await supabase.from("messages").insert({
        conversation_id: conversaAtivaId,
        user_id: user.id,
        role: msg.role,
        content: msg.content,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversaAtivaId);
    },
    [user, conversaAtivaId],
  );

  const setMensagensLocal = useCallback((updater: (prev: Mensagem[]) => Mensagem[]) => {
    setMensagens(updater);
  }, []);

  return {
    conversas,
    conversaAtivaId,
    mensagens,
    loading,
    criarConversa,
    trocarConversa,
    renomearConversa,
    apagarConversa,
    salvarMensagem,
    setMensagensLocal,
    recarregar: carregarConversas,
  };
}
