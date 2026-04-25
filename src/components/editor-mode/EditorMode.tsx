import { useEffect, useRef, useState } from "react";
import { Code2, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "./useIsAdmin";

/**
 * MODO EDITOR — Feature isolada e temporária.
 *
 * Para REMOVER COMPLETAMENTE:
 *   1. Delete a pasta `src/components/editor-mode/`
 *   2. Remova `<EditorMode />` de `src/App.tsx`
 *   3. Delete `supabase/functions/editor-chat/`
 *
 * Acesso restrito ao email definido em `useIsAdmin.ts`.
 */

type Msg = { role: "user" | "assistant" | "system"; content: string };

export function EditorMode() {
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "// Modo Editor inicializado.\n// Pergunte sobre núcleos, disciplinas, conexões, níveis, patentes, system prompt da Sofia ou configs do Supabase.\n// Comandos úteis: \"mostre os núcleos\", \"exporte as disciplinas em JSON\", \"qual é o system prompt atual?\".",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!isAdmin) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    console.log("[EditorMode] →", text);

    try {
      const { data, error } = await supabase.functions.invoke("editor-chat", {
        body: { messages: next.filter((m) => m.role !== "system") },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "// Sem resposta.";
      console.log("[EditorMode] ←", reply.slice(0, 200));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[EditorMode] erro:", msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `// ERRO: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão flutuante discreto */}
      <button
        type="button"
        onClick={() => {
          console.log("[EditorMode] abrir");
          setOpen(true);
        }}
        title="Modo Editor (admin)"
        aria-label="Abrir Modo Editor"
        className="fixed bottom-4 right-4 z-[60] h-10 w-10 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700 shadow-lg hover:text-emerald-400 hover:border-emerald-500/50 transition-colors flex items-center justify-center font-mono"
      >
        <Code2 className="w-4 h-4" strokeWidth={1.75} />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-3xl h-[80vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col font-mono text-sm text-zinc-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-100 font-semibold tracking-tight">
                  Modo Editor — Acesso ao Sistema
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aviso */}
            <div className="px-4 py-2 text-[11px] text-amber-400/80 border-b border-zinc-800 bg-amber-500/5">
              ⚠ Este modo é temporário e será removido em versão futura.
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="leading-relaxed">
                  <div
                    className={
                      m.role === "user"
                        ? "text-emerald-400 text-[11px] mb-1"
                        : "text-zinc-500 text-[11px] mb-1"
                    }
                  >
                    {m.role === "user" ? "> admin" : "// sistema"}
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-zinc-200 font-mono text-[13px]">
                    {m.content}
                  </pre>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  processando...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
                placeholder='ex.: exporte as disciplinas em JSON'
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 font-mono text-[13px]"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="px-3 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-600/40 hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
