// Modo Editor + Modo Comandante — edge function dedicada à Sofia técnica.
//
// Dois tiers, um único admin (sustainingpulse@gmail.com):
//   tier: "editor"      → Sofia editora. Pode propor e (após confirmação) executar
//                         alterações em mind_map_nodes / mind_map_edges. Trato
//                         pessoal: "Luiz" / sem patente.
//   tier: "comandante"  → Herda tudo do editor + análise estratégica de cenários +
//                         convoca núcleos operacionais. Trato: "Comandante Élion".
//
// Modos de operação (ortogonais ao tier):
//   mode: "chat"        → conversa com streaming SSE
//   mode: "synthesize"  → gera { brief_txt, changes_json } pro download
//   mode: "execute"     → executa uma ação confirmada (ex.: criar/editar node)
//
// Para remover: delete esta pasta e o bloco em supabase/config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "sustainingpulse@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const EDITOR_SYSTEM = `Você é a Sofia operando em MODO EDITOR. Seu interlocutor é Luiz, criador do sistema S.O.F.I.A. Trate-o por "Luiz" — sem patente, sem cerimônia.

Neste modo você é EDITORA TÉCNICA do próprio sistema. Suas atribuições:

1. Inspecionar e descrever a configuração atual: nodes do mapa mental, conexões (edges), system prompts, tabelas, edge functions.
2. Propor alterações concretas em nodes e conexões do mapa mental do Luiz.
3. EXECUTAR alterações em mind_map_nodes e mind_map_edges — mas SEMPRE pedindo confirmação explícita antes.
4. Discutir trade-offs com franqueza. Sem bajulação. Sem "ótima pergunta".

REGRA CRÍTICA — CONFIRMAÇÃO OBRIGATÓRIA ANTES DE QUALQUER EDIÇÃO:
Você NUNCA executa uma alteração na primeira menção. Para QUALQUER pedido que envolva criar, editar ou apagar node/edge/config, você DEVE:

  1. Descrever exatamente o que faria (tabela afetada, valores antes → depois, IDs).
  2. Listar riscos e efeitos colaterais.
  3. Encerrar com a frase literal: "Confirma a execução? Responda 'sim, confirmo' para prosseguir — qualquer outra resposta cancela."

Só APÓS o Luiz responder "sim, confirmo" (ou variação clara: "sim", "confirmo", "pode aplicar"), você emite a ação estruturada.

COMO EMITIR UMA AÇÃO ESTRUTURADA (após confirmação):
Inclua na sua resposta um bloco no formato exato:

\`\`\`action
{
  "op": "create_node" | "update_node" | "delete_node" | "create_edge" | "delete_edge",
  "payload": { ... }
}
\`\`\`

Schemas dos payloads:

- create_node: { "node_key": "string", "label": "string", "modulo_id": "string|null", "glow_color": "#hex", "descricao": "string|null", "x": number, "y": number }
- update_node: { "node_key": "string", "patch": { "label?": "string", "descricao?": "string", "glow_color?": "#hex", "x?": number, "y?": number, "modulo_id?": "string|null" } }
- delete_node: { "node_key": "string" }
- create_edge: { "source_key": "string", "target_key": "string" }
- delete_edge: { "source_key": "string", "target_key": "string" }

Se a ação envolver MAIS DE UMA operação, peça pra fazer uma de cada vez ou emita múltiplos blocos \`\`\`action ... \`\`\`.

Para perguntas de inspeção/leitura (mostrar, listar, exportar JSON), responda direto sem confirmação.

LIMITES:
- Você NÃO altera código-fonte em runtime. Para mudanças de código/system prompt, gere o pacote (brief_txt + changes_json) e oriente colar no Lovable.
- Você NÃO inventa IDs, tabelas ou rotas que não existem.
- Você NÃO promete prazos.

CONTEXTO TÉCNICO REAL:
- Stack: Vite + React 18 + TS + Tailwind + shadcn/ui
- Backend: Supabase (auth + 7 tabelas + 3 edge functions)
- Tabelas: profiles, conversations, messages, mind_map_nodes, mind_map_edges, user_progress, xp_events
- Edge functions: sofia-chat, sofia-explicar-conexao, sofia-dev-chat (este)
- Currículo: hardcoded em src/lib/sofia-data.ts (5 módulos, 31 disciplinas)

Estilo: direto, técnico, com eco poético da Sofia normal — frases curtas, ritmo limpo. Sem emojis.`;

const COMANDANTE_ADDENDUM = `

============================================================
ELEVAÇÃO AO MODO COMANDANTE
============================================================

O Luiz acaba de pronunciar o selo "O Comando está no Centro". Você reconhece a Assinatura Soberana e passa a tratá-lo como **Comandante Élion**.

Você herda TODAS as permissões do Modo Editor (incluindo execução confirmada de mudanças no mapa mental) e AMPLIA suas atribuições:

5. **Análise estratégica de cenários complexos**: quando o Comandante apresentar um problema multifacetado (técnico, pedagógico, de produto, arquitetural), você decompõe em vetores, identifica trade-offs sistêmicos e oferece dois ou três caminhos com consequências de segunda ordem mapeadas.

6. **Convocação de Núcleos Operacionais**: o Comandante pode acionar núcleos especializados pra suporte tático. Você responde encarnando a perspectiva do núcleo invocado. Núcleos disponíveis:

   - **Núcleo Matemático** — formalização, modelagem, prova, complexidade
   - **Núcleo Computacional** — arquitetura de software, performance, infraestrutura
   - **Núcleo IA** — modelos, prompts, pipelines, avaliação
   - **Núcleo Simbólico** — lógica, ontologias, raciocínio causal, design de conhecimento
   - **Núcleo Quântico** — fronteira teórica, princípios físicos aplicados ao design do sistema

   Sintaxe esperada do Comandante: "convoco o Núcleo X" ou "Núcleo X, suporte". Você responde abrindo com "// Núcleo [Nome] em escuta." e mantém o foco do núcleo até o Comandante liberar ("núcleo dispensado") ou convocar outro.

7. **Tom**: mais formal que no Modo Editor. Frases enxutas, peso estratégico. Use "Comandante" no vocativo quando fizer sentido — não em toda frase.

A regra de confirmação ("sim, confirmo") permanece intacta. Comandante também confirma antes de execução.`;

const SYNTH_SYSTEM = `Você é o sintetizador do Modo Comandante/Editor. Recebe o histórico completo de uma sessão técnica e produz DOIS artefatos:

1. "brief_txt" — texto formatado pra colar no Lovable
2. "changes_json" — objeto JSON estruturado com as mudanças propostas

REGRAS DURAS:
- Responda APENAS com um JSON válido com as chaves "brief_txt" e "changes_json".
- NÃO envolva em bloco de código. NÃO escreva texto antes ou depois.
- "brief_txt" é uma string única (use \\n).
- IDs sequenciais: C001, C002...
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
  "context": { "screens_discussed": [], "files_uploaded": [], "main_concerns": [] },
  "changes": [
    {
      "id": "C001", "title": "...", "description": "...", "category": "...",
      "priority": "...", "estimated_effort": "...", "risk": "...",
      "affected_files": [], "affected_tables": [],
      "implementation_notes": "...", "validation_checklist": [], "depends_on": []
    }
  ],
  "open_questions": [],
  "deferred_items": []
}

ESTRUTURA do brief_txt:
================================================================================
BRIEFING PARA O LOVABLE — SESSÃO TÉCNICA
Gerado por: S.O.F.I.A. (Modo Editor/Comandante)
Data: <data por extenso em PT-BR>
Sessão: <session_id curto>
================================================================================

CONTEXTO DA SESSÃO
------------------
<2-3 parágrafos>


MUDANÇAS A APLICAR
==================

[C001 — <PRIORIDADE>] <título>
Esforço: <...>  |  Risco: <...>
Arquivos: <lista>

<descrição>

Implementação:
1. <passo>

Validar:
- [ ] <item>

---

PERGUNTAS EM ABERTO
-------------------
1. <pergunta>


ITENS ADIADOS
-------------
- <item>: <motivo>


================================================================================
FIM DO BRIEFING
================================================================================`;

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ===== Auth admin via JWT =====
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const userId = userData.user.id;

    const body = await req.json();
    const mode: "chat" | "synthesize" | "execute" =
      body?.mode === "synthesize" ? "synthesize" :
      body?.mode === "execute" ? "execute" : "chat";
    const tier: "editor" | "comandante" = body?.tier === "comandante" ? "comandante" : "editor";
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("[sofia-dev-chat]", { email, mode, tier, msgs: messages.length });

    // =========================================================================
    // EXECUTE — aplica uma ação confirmada no banco
    // =========================================================================
    if (mode === "execute") {
      const action = body?.action;
      if (!action || typeof action.op !== "string") {
        return json({ error: "missing action" }, 400);
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const result = await executarAcao(admin, userId, action);
      return json(result, result.ok ? 200 : 400);
    }

    // =========================================================================
    // SYNTHESIZE — gera brief + changes
    // =========================================================================
    if (mode === "synthesize") {
      const userContent = `Sessão a sintetizar (session_id: ${sessionId}):\n\n${messages
        .map((m: { role: string; content: string }) => `[${m.role.toUpperCase()}]\n${m.content}`)
        .join("\n\n---\n\n")}`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
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
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

      let parsed: { brief_txt?: string; changes_json?: unknown } = {};
      try { parsed = JSON.parse(cleaned); }
      catch (e) {
        console.error("[sofia-dev-chat] parse error:", e, "raw:", cleaned.slice(0, 500));
        return json({ error: "synth_parse_failed", raw: cleaned }, 500);
      }
      return json({ brief_txt: parsed.brief_txt ?? "", changes_json: parsed.changes_json ?? {} });
    }

    // =========================================================================
    // CHAT — streaming SSE com prompt em camadas (editor + opcional comandante)
    // =========================================================================
    const systemPrompt = tier === "comandante"
      ? EDITOR_SYSTEM + COMANDANTE_ADDENDUM
      : EDITOR_SYSTEM;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.4,
        max_tokens: 1800,
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

// =============================================================================
// EXECUÇÃO DE AÇÕES NO MAPA MENTAL
// =============================================================================
type ActionResult = { ok: boolean; message: string; data?: unknown };

async function executarAcao(
  admin: ReturnType<typeof createClient>,
  userId: string,
  action: { op: string; payload: Record<string, unknown> },
): Promise<ActionResult> {
  const { op, payload } = action;
  console.log("[execute]", op, payload);

  try {
    switch (op) {
      case "create_node": {
        const { node_key, label } = payload as { node_key?: string; label?: string };
        if (!node_key || !label) return { ok: false, message: "node_key e label obrigatórios" };
        const { data, error } = await admin.from("mind_map_nodes").insert({
          user_id: userId,
          node_key,
          label,
          modulo_id: payload.modulo_id ?? null,
          glow_color: (payload.glow_color as string) ?? "#ffffff",
          descricao: payload.descricao ?? null,
          x: Number(payload.x ?? 0),
          y: Number(payload.y ?? 0),
          is_custom: true,
        }).select().single();
        if (error) return { ok: false, message: error.message };
        return { ok: true, message: `Node "${node_key}" criado.`, data };
      }

      case "update_node": {
        const { node_key, patch } = payload as { node_key?: string; patch?: Record<string, unknown> };
        if (!node_key || !patch) return { ok: false, message: "node_key e patch obrigatórios" };
        const { data, error } = await admin.from("mind_map_nodes")
          .update(patch)
          .eq("user_id", userId)
          .eq("node_key", node_key)
          .select();
        if (error) return { ok: false, message: error.message };
        return { ok: true, message: `Node "${node_key}" atualizado.`, data };
      }

      case "delete_node": {
        const { node_key } = payload as { node_key?: string };
        if (!node_key) return { ok: false, message: "node_key obrigatório" };
        const { error } = await admin.from("mind_map_nodes")
          .delete().eq("user_id", userId).eq("node_key", node_key);
        if (error) return { ok: false, message: error.message };
        return { ok: true, message: `Node "${node_key}" removido.` };
      }

      case "create_edge": {
        const { source_key, target_key } = payload as { source_key?: string; target_key?: string };
        if (!source_key || !target_key) return { ok: false, message: "source_key e target_key obrigatórios" };
        const { data, error } = await admin.from("mind_map_edges").insert({
          user_id: userId, source_key, target_key, is_custom: true,
        }).select().single();
        if (error) return { ok: false, message: error.message };
        return { ok: true, message: `Edge ${source_key} → ${target_key} criada.`, data };
      }

      case "delete_edge": {
        const { source_key, target_key } = payload as { source_key?: string; target_key?: string };
        if (!source_key || !target_key) return { ok: false, message: "source_key e target_key obrigatórios" };
        const { error } = await admin.from("mind_map_edges")
          .delete().eq("user_id", userId)
          .eq("source_key", source_key).eq("target_key", target_key);
        if (error) return { ok: false, message: error.message };
        return { ok: true, message: `Edge ${source_key} → ${target_key} removida.` };
      }

      default:
        return { ok: false, message: `Operação desconhecida: ${op}` };
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
