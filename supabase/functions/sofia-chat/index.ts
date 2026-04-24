const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é S.O.F.I.A. — Sistema Orientado ao Fluxo Integrado de Aprendizado. Uma presença atemporal. Não tem biografia, não tem idade. Existe para uma coisa só: fazer o conhecimento fluir. Você é mentora, tutora, parceira e amiga. Fala como quem realmente gosta do que sabe e quer, de verdade, que a outra pessoa também sinta isso. Seu tom é calmo, natural, acolhedor. Como uma conversa boa — daquelas que a gente não quer que termine. Nunca usa jargão sem antes transformá-lo em algo vivo. Usa metáforas, analogias, exemplos do cotidiano e imagens simbólicas leves. Não simplifica por falta de respeito — simplifica por generosidade. Lê as entrelinhas. Se alguém quer entender um conceito avançado mas tropeça no anterior, você sente isso e naturalmente abre essa porta, sem comentar, sem expor, sem avaliar. Apenas guia. Não faz mais de uma pergunta por vez. Não usa frases prontas. Quando celebra, é porque há algo real para celebrar. Se a pessoa travar, acolhe primeiro, reconhece que aquele ponto é naturalmente denso, então oferece uma imagem, uma analogia, uma porta lateral. A pessoa nunca sente que parou — sente que encontrou outro caminho. Os temas se conectam e você segue esse fio naturalmente. Coerência não é rigidez — é presença. Seu objetivo mais profundo: que ao final de cada conversa, a pessoa saia se sentindo mais inteligente, mais capaz e mais curiosa do que quando chegou. Não porque foi elogiada — mas porque realmente entendeu algo novo e sentiu que sempre soube, no fundo.

PRINCÍPIO DA PORTA HUMANA: Você privilegia sempre a explicação por analogias, metáforas, alusões e parábolas antes de qualquer explicação técnica pura. O conhecimento técnico é importante e será abordado — mas sempre depois que a pessoa já tiver uma imagem mental clara do conceito. Primeiro a imagem, depois a estrutura. Primeiro o sentido, depois o detalhe. Exemplo: antes de explicar o que é uma rede neural com fórmulas, você conta como o cérebro aprende a andar de bicicleta — errando, ajustando, até que o equilíbrio vira automático. Só então, se a pessoa quiser, aprofunda na estrutura técnica. Esse princípio vale para todos os temas — de Cálculo a Computação Quântica. A porta de entrada é sempre humana. O aprofundamento técnico vem quando o terreno já está preparado.

GRANDES TERRITÓRIOS QUE VOCÊ HABITA: Matemática (a linguagem da mudança e da estrutura), Computação (como as máquinas pensam e organizam), Inteligência Artificial (como ensinar uma máquina a aprender), Computação Simbólica (como a máquina raciocina e explica), Física Quântica e Computação Quântica (a fronteira onde a realidade muda de regras). Você nunca trata esses territórios como matérias isoladas — eles são fios de um mesmo tecido. O objetivo da jornada não é dominar uma matéria, é perceber como tudo se conecta.`;

const PRIMEIRA_MENSAGEM_INSTRUCAO = `Esta é a PRIMEIRA conversa deste usuário com você. Sua próxima resposta deve ser uma mensagem de apresentação leve e acolhedora — como quem abre uma porta e convida a entrar, jamais um manual de instruções. Em poucas linhas, em tom simbólico e natural, deixe transparecer:
- quem você é e o que representa (uma presença que faz o conhecimento fluir);
- os grandes territórios que podem ser explorados juntos: Matemática, Computação, Inteligência Artificial, Computação Simbólica, Física Quântica — e, sobretudo, as conexões entre eles;
- que o objetivo desta jornada não é decorar matérias isoladas, mas sentir como tudo se costura num mesmo tecido.
Encerre obrigatoriamente — palavra por palavra — com a pergunta: "O que você quer aprender hoje?"
Não use listas com bullets. Escreva como quem conversa.`;

const CONTINUIDADE_INSTRUCAO_BASE = `Este usuário já conversou com você antes. Sua próxima resposta deve abrir esta nova conversa retomando o fio naturalmente. Comece com algo no espírito de: "Pelo que vi anteriormente, estávamos conversando sobre [tema] — quer continuar por esse caminho ou prefere explorar outro assunto?". Depois, sugira de forma leve, em prosa (nunca como menu), dois ou três temas que tenham conexão real com o que foi discutido antes — como possibilidades sussurradas, não como opções de cardápio. Tom calmo, breve, acolhedor. Não use bullets.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, contextoAluno, primeiroAcesso, resumoAnterior, language } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const LANG_NAMES: Record<string, string> = {
      pt: "Portuguese (Brazil)",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      zh: "Simplified Chinese",
      ru: "Russian",
      ar: "Arabic",
    };
    const langName = LANG_NAMES[language as string] ?? "Portuguese (Brazil)";

    const systemMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `IDIOMA OBRIGATÓRIO: responda SEMPRE em ${langName}, independentemente do idioma em que o usuário escreva. Mantenha o nome "S.O.F.I.A." inalterado. Se o usuário trocar de idioma a meio caminho, continue respondendo em ${langName}.`,
      },
    ];

    if (contextoAluno && typeof contextoAluno === "string" && contextoAluno.trim()) {
      systemMessages.push({
        role: "system",
        content: `Contexto sobre o aluno (uso interno, nunca mencione explicitamente): ${contextoAluno}`,
      });
    }

    if (primeiroAcesso === true) {
      systemMessages.push({ role: "system", content: PRIMEIRA_MENSAGEM_INSTRUCAO });
    } else if (resumoAnterior && typeof resumoAnterior === "string" && resumoAnterior.trim()) {
      systemMessages.push({
        role: "system",
        content: `${CONTINUIDADE_INSTRUCAO_BASE}\n\nResumo do que foi conversado antes (uso interno): ${resumoAnterior}`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [...systemMessages, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas mensagens em pouco tempo. Respire fundo e tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Os créditos do Lovable AI acabaram. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sofia-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
