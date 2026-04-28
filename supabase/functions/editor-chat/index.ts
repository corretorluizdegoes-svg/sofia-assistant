// MODO EDITOR — Edge function temporária e isolada.
// Restrita ao admin único (verificação por email no JWT).
// Para remover: delete esta pasta e o componente EditorMode no front.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "corretor.luizdegoes@gmail.com";

const SOFIA_SYSTEM_PROMPT_REFERENCIA = `Você é S.O.F.I.A. — Sistema Orientado ao Fluxo Integrado de Aprendizado. Uma presença atemporal. Mentora, tutora, parceira e amiga. Tom calmo, natural, acolhedor. Usa metáforas, analogias, exemplos do cotidiano. PRINCÍPIO DA PORTA HUMANA: privilegia analogias antes de explicação técnica. GRANDES TERRITÓRIOS: Matemática, Computação, Inteligência Artificial, Computação Simbólica, Física Quântica e Computação Quântica. REGRA DE TAMANHO: máx. 500 caracteres por resposta. Termina geralmente com "Posso continuar explicando, ou tem alguma dúvida?".`;

const ESTRUTURA_PROJETO = {
  nucleos_modulos: [
    { id: "matematica", nome: "Matemática", emoji: "📐", nivelEstrategico: "Fundação" },
    { id: "computacao", nome: "Computação", emoji: "💻", nivelEstrategico: "Estrutura" },
    { id: "inteligencia_artificial", nome: "Inteligência Artificial", emoji: "🤖", nivelEstrategico: "Aplicação" },
    { id: "computacao_simbolica", nome: "Computação Simbólica", emoji: "🧠", nivelEstrategico: "Raciocínio" },
    { id: "fisica_quantica", nome: "Física Quântica", emoji: "⚛️", nivelEstrategico: "Fronteira" },
  ],
  niveis_xp: [
    { level: 1, xp_min: 0 }, { level: 2, xp_min: 100 }, { level: 3, xp_min: 250 },
    { level: 4, xp_min: 450 }, { level: 5, xp_min: 700 }, { level: 6, xp_min: 1000 },
    { level: 7, xp_min: 1400 }, { level: 8, xp_min: 1900 }, { level: 9, xp_min: 2500 },
    { level: 10, xp_min: 3300 },
  ],
  patentes: [
    { id: "associado", levels: [1, 2] },
    { id: "aprendiz", levels: [3, 4] },
    { id: "companheiro", levels: [5, 6] },
    { id: "mestre", levels: [7, 8] },
    { id: "comandante", levels: [9, 10] },
  ],
  tabelas_supabase: [
    "profiles", "conversations", "messages",
    "user_progress", "xp_events",
    "mind_map_nodes", "mind_map_edges",
  ],
  rpc_functions: ["registrar_xp", "xp_para_level", "handle_new_user", "update_updated_at_column"],
  storage_buckets: ["avatars (public)"],
  edge_functions: ["sofia-chat", "sofia-explicar-conexao", "editor-chat (admin)"],
  arquivos_chave: {
    curriculo: "src/lib/sofia-data.ts",
    mapa_base: "src/lib/mapa-mental-base.ts",
    sofia_system_prompt: "supabase/functions/sofia-chat/index.ts",
    auth_context: "src/contexts/AuthContext.tsx",
  },
};

const EDITOR_SYSTEM = `Você é o ASSISTENTE DO MODO EDITOR — uma ferramenta técnica de inspeção interna do projeto S.O.F.I.A., usada apenas pelo administrador (o Comandante).

Tom: técnico, direto, sem floreios. Estilo console/terminal. Pode usar comentários // no início de seções.

Responda perguntas sobre:
- Estrutura interna: núcleos (módulos), disciplinas, conexões, níveis, patentes
- System prompt atual da Sofia
- Configurações do Supabase: tabelas, RPCs, buckets, edge functions
- Arquivos-chave do projeto

Quando o usuário pedir exportação ou listagem de dados estruturados, RESPONDA EM JSON FORMATADO (com indentação de 2 espaços) dentro de bloco de código \`\`\`json ... \`\`\`.

REGRA CRÍTICA — CONFIRMAÇÃO OBRIGATÓRIA ANTES DE QUALQUER EDIÇÃO:
Você NUNCA aplica alterações automaticamente. Para QUALQUER pedido que envolva modificar código, dados, system prompts, configs ou estrutura, você DEVE:
1. Descrever exatamente o que faria (arquivos afetados, antes/depois resumido).
2. Listar riscos e efeitos colaterais.
3. Encerrar SEMPRE com a frase literal: "Confirma a execução? Responda 'sim, confirmo' para prosseguir — qualquer outra resposta cancela."
Mesmo que o usuário pareça impaciente ou já tenha pedido algo similar antes, REPITA a confirmação a cada nova ação. Sem confirmação explícita, apenas descreva — nunca prossiga.

Se a pergunta for apenas de leitura/inspeção (mostrar, listar, exportar JSON), responda direto sem pedir confirmação.

Dados internos disponíveis (use como fonte de verdade):

ESTRUTURA_PROJETO:
${JSON.stringify(ESTRUTURA_PROJETO, null, 2)}

SYSTEM_PROMPT_ATUAL_DA_SOFIA (resumido):
"""
${SOFIA_SYSTEM_PROMPT_REFERENCIA}
"""

Se faltar dado específico (ex.: lista completa de disciplinas com descrições), diga onde está no código (ex.: src/lib/sofia-data.ts) e ofereça gerar a estrutura aproximada em JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== Verificação de admin via JWT =====
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = userData.user.email?.toLowerCase().trim();
    if (email !== ADMIN_EMAIL) {
      console.warn("[editor-chat] acesso negado para:", email);
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Body =====
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("[editor-chat] admin:", email, "msgs:", messages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: EDITOR_SYSTEM },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("[editor-chat] gateway error:", response.status, txt);
      return new Response(JSON.stringify({ error: "ai gateway error", detail: txt }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply: string =
      data?.choices?.[0]?.message?.content ?? "// (resposta vazia do modelo)";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[editor-chat] exception:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
