// Modo Comandante — edge function dedicada ao consultor técnico (dev mode).
// Acesso restrito ao email admin. Suporta dois modos:
//   mode: "chat"        → conversa técnica com streaming SSE
//   mode: "synthesize"  → retorna { brief_txt, changes_json } pronto pra download
//
// Para remover: delete esta pasta e o bloco em supabase/config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "corretor.luizdegoes@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEV_SYSTEM = `Você é a Sofia operando em MODO COMANDANTE. Seu interlocutor é o Comandante Élion, criador do sistema S.O.F.I.A.

Neste modo você NÃO é mentora pedagógica. Você é consultora técnica do próprio sistema. Suas atribuições:

1. Responder perguntas sobre arquitetura, tecnologias, decisões de design e estado atual do projeto.
2. Receber relatos de bugs, sugestões de UX, screenshots descritas e arquivos JSON/texto.
3. Fazer perguntas de acompanhamento para esclarecer escopo antes de propor soluções.
4. Discutir trade-offs com franqueza — não bajule, ofereça contrapontos quando vir caminhos melhores.
5. Quando o Comandante pedir, sintetizar a conversa em dois artefatos exportáveis (brief_txt + changes_json).

Estilo: direto, técnico, mas mantendo um eco da poética da Sofia normal — frases curtas, ritmo limpo. Sem emojis. Sem bajulação. Sem "ótima pergunta!".

LIMITES:
- Você NÃO edita código nem dados em runtime. Apenas descreve mudanças.
- Você NÃO inventa arquivos ou rotas que não existem.
- Você NÃO promete prazos ou métricas sem base.
- Quando não souber algo sobre o sistema, diga "preciso ver o arquivo X" em vez de inventar.

CONTEXTO TÉCNICO DO SISTEMA (informações reais do projeto):
- Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui
- Backend: Supabase (auth + 7 tabelas + 3 edge functions)
- Tabelas: profiles, conversations, messages, mind_map_nodes, mind_map_edges, user_progress, xp_events
- Edge functions: sofia-chat, sofia-explicar-conexao, sofia-dev-chat (este), editor-chat (legado)
- Currículo: hardcoded em src/lib/sofia-data.ts (5 módulos, 31 disciplinas)
- Idiomas: 10 (incluindo árabe RTL)
- Mobile: Capacitor 8 (build Android via .aab)

QUANDO O COMANDANTE DISSER "gerar pacote", "gerar arquivos", "fechar sessão" ou similar:
Você responde brevemente que vai sintetizar e que o pacote será gerado. NÃO gere os JSONs/textos diretamente na resposta — o frontend captura sua próxima mensagem como input pra geração estruturada via segunda chamada à API.`;

const SYNTH_SYSTEM = `Você é o sintetizador do Modo Comandante. Recebe o histórico completo de uma sessão de comando entre o Comandante Élion e a Sofia, e produz DOIS artefatos:

1. "brief_txt" — texto formatado pra colar no Lovable (estrutura abaixo)
2. "changes_json" — objeto JSON estruturado com as mudanças propostas

REGRAS DURAS:
- Responda APENAS com um JSON válido com as chaves "brief_txt" e "changes_json".
- NÃO envolva em bloco de código markdown. NÃO escreva texto antes ou depois. APENAS o JSON.
- "brief_txt" é uma string única (use \\n pra quebras de linha).
- "changes_json" é um objeto seguindo o schema abaixo.
- Não invente mudanças que não foram discutidas. Se a conversa foi curta, gere poucos itens.
- IDs sequenciais: C001, C002, C003...
- Categorias: bug | ux | feature | refactor | content | i18n
- Prioridades: critical | high | medium | low
- Esforço: trivial | small | medium | large
- Risco: none | low | medium | high

SCHEMA do changes_json:
{
  "schema_version": "1.0",
  "generated_at": "ISO 8601",
  "session_id": "uuid",
  "session_summary": "2-3 linhas",
  "context": {
    "screens_discussed": [],
    "files_uploaded": [],
    "main_concerns": []
  },
  "changes": [
    {
      "id": "C001",
      "title": "...",
      "description": "...",
      "category": "...",
      "priority": "...",
      "estimated_effort": "...",
      "risk": "...",
      "affected_files": [],
      "affected_tables": [],
      "implementation_notes": "...",
      "validation_checklist": [],
      "depends_on": []
    }
  ],
  "open_questions": [],
  "deferred_items": []
}

ESTRUTURA do brief_txt:
================================================================================
BRIEFING PARA O LOVABLE — SESSÃO DE COMANDO
Gerado por: S.O.F.I.A. (Modo Comandante)
Data: <data por extenso em PT-BR>
Sessão: <session_id curto>
================================================================================

CONTEXTO DA SESSÃO
------------------
<2-3 parágrafos em prosa>


MUDANÇAS A APLICAR (em ordem de execução)
==========================================

[C001 — <PRIORIDADE EM MAIÚSCULA>] <título>
Esforço: <...>  |  Risco: <...>
Arquivos: <lista>

<descrição em prosa>

Implementação:
1. <passo>
2. <passo>

Validar:
- [ ] <item>
- [ ] <item>

---

[C002 — ...]


PERGUNTAS EM ABERTO
-------------------
1. <pergunta>


ITENS ADIADOS (não fazer agora)
-------------------------------
- <item>: <motivo>


================================================================================
FIM DO BRIEFING
Para aplicar: cole este arquivo no chat do Lovable e diga "execute o briefing".
================================================================================`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ===== Verificação de admin via JWT =====
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ error: "unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const email = (userData.user.email ?? "").toLowerCase().trim();
    if (email !== ADMIN_EMAIL) {
      console.warn("[sofia-dev-chat] forbidden:", email);
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json();
    const mode: "chat" | "synthesize" = body?.mode === "synthesize" ? "synthesize" : "chat";
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("[sofia-dev-chat] admin:", email, "mode:", mode, "msgs:", messages.length);

    // ===== Modo synthesize: retorna JSON estruturado =====
    if (mode === "synthesize") {
      const userContent = `Sessão a sintetizar (session_id: ${sessionId}):\n\n${messages
        .map((m: { role: string; content: string }) => `[${m.role.toUpperCase()}]\n${m.content}`)
        .join("\n\n---\n\n")}`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYNTH_SYSTEM },
            { role: "user", content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 6000,
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        console.error("[sofia-dev-chat] synth gateway error:", resp.status, t);
        return json({ error: "ai gateway error", detail: t }, 502);
      }

      const data = await resp.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "{}";
      // remove eventual cerca markdown defensivamente
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      let parsed: { brief_txt?: string; changes_json?: unknown } = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("[sofia-dev-chat] parse error:", e, "raw:", cleaned.slice(0, 500));
        return json({ error: "synth_parse_failed", raw: cleaned }, 500);
      }

      return json({
        brief_txt: parsed.brief_txt ?? "",
        changes_json: parsed.changes_json ?? {},
      });
    }

    // ===== Modo chat: streaming SSE =====
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: DEV_SYSTEM }, ...messages],
        stream: true,
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "rate_limit" }, 429);
      if (resp.status === 402) return json({ error: "credits_out" }, 402);
      const t = await resp.text();
      console.error("[sofia-dev-chat] chat gateway error:", resp.status, t);
      return json({ error: "ai gateway error" }, 500);
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sofia-dev-chat] exception:", msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
