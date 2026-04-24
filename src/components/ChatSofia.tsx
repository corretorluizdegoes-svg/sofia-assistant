import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, Send, Trash2, BookOpen, User, Sparkles, MessageCircle, Network, Target } from "lucide-react";
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sofia-chat`;

type Props = {
  startMessage?: string | null;
  onConsumeStartMessage?: () => void;
};

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { registrarInteracao, nivelAtual, xp, topicosExplorados, conquistas, totalMensagens } = useProgresso();
  const { toast } = useToast();
  const { user } = useAuth();

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

    setAberturaFeita(true);
    const ehPrimeiroAcesso = (totalMensagens ?? 0) === 0;
    abrirConversa(ehPrimeiroAcesso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConv, conversaAtivaId, mensagens.length, aberturaFeita, isSending, startMessage, totalMensagens]);

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

    if (resp.status === 429) {
      toast({ title: t("chat.rateLimit"), description: t("chat.rateLimitDesc") });
      throw new Error("rate_limit");
    }
    if (resp.status === 402) {
      toast({ title: t("chat.creditsOut"), description: t("chat.creditsOutDesc") });
      throw new Error("payment_required");
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
      .select("id, title, disciplina")
      .eq("user_id", user.id)
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
      if (!ehPrimeiroAcesso) {
        resumo = await buscarResumoAnterior();
      }
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

  async function enviarTexto(texto: string) {
    if (!texto || isSending || !conversaAtivaId) return;

    const userMsg: Mensagem = { role: "user", content: texto };
    const historicoCompleto: Mensagem[] = [...mensagens, userMsg];

    setMensagensLocal((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    await salvarMensagem(userMsg);

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

    try {
      const respostaCompleta = await streamResposta(historicoCompleto);
      if (respostaCompleta.trim()) {
        await salvarMensagem({ role: "assistant", content: respostaCompleta });
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
          <h1 className="font-display font-bold text-lg leading-tight text-foreground tracking-tight">S.O.F.I.A.</h1>
          <p className="text-xs text-muted-foreground truncate">
            Sistema Orientado ao Fluxo Integrado de Aprendizado
          </p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full tone-blue px-2.5 py-1 text-xs font-semibold">
          <NivelIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
          {nivelAtual.nome}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => criarConversa()}
          className="rounded-full text-slate-500 hover:text-primary hover:bg-primary/5"
          title={t("chat.new")}
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span className="hidden sm:inline text-xs">{t("chat.new")}</span>
        </Button>
      </header>

      {/* Lista de conversas */}
      {conversas.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40 bg-white/30 overflow-x-auto scrollbar-soft">
          {conversas.map((c: Conversa) => {
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
                {ativa && conversas.length > 1 && (
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
        </div>
      )}

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-soft px-4 sm:px-8 py-6 space-y-5">
        {loadingConv ? (
          <div className="text-center text-sm text-muted-foreground">{t("chat.loading")}</div>
        ) : mensagensExibidas.length === 0 && !isSending ? (
          <WelcomeCards onPick={(msg) => enviarTexto(msg)} />
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

      {/* Input flutuante */}
      <form onSubmit={enviar} className="px-3 sm:px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 bg-white rounded-full border border-border/70 focus-within:border-primary/50 focus-within:shadow-glow shadow-soft transition-all pl-5 pr-2 py-2">
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
            placeholder={t("chat.placeholder")}
            className="flex-1 resize-none bg-transparent outline-none text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 max-h-40 py-2"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="shrink-0 w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center shadow-soft hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
            aria-label={t("common.send")}
          >
            <Send className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/80 text-center">
          {t("chat.footer")}
        </p>
      </form>
    </section>
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
