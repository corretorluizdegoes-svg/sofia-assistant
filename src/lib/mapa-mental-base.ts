import { modulos, convergencias } from "@/lib/sofia-data";

export type GlowColor = string;

export const moduloGlow: Record<string, GlowColor> = {
  matematica: "#4DA8FF",            // azul
  computacao: "#22D3EE",            // ciano
  inteligencia_artificial: "#A78BFA", // violeta
  computacao_simbolica: "#F4C152",  // dourado
  fisica_quantica: "#FFFFFF",       // branco brilhante
  convergencias: "#34D399",         // verde neon
  custom: "#E2E8F0",                // branco neutro
};

export type BaseNode = {
  node_key: string;
  label: string;
  modulo_id: string; // chave em moduloGlow
  glow_color: string;
  descricao: string | null;
  is_custom: false;
};

export type BaseEdge = {
  source_key: string;
  target_key: string;
};

/**
 * Constrói o conjunto canônico de pontos e conexões a partir da grade
 * curricular (módulos, disciplinas e convergências).
 */
export function construirMapaBase(): { nodes: BaseNode[]; edges: BaseEdge[] } {
  const nodes: BaseNode[] = [];
  const edges: BaseEdge[] = [];
  const seen = new Set<string>();

  // 1. Módulos (núcleo de cada galáxia)
  for (const m of modulos) {
    const key = `mod:${m.id}`;
    nodes.push({
      node_key: key,
      label: m.nome,
      modulo_id: m.id,
      glow_color: moduloGlow[m.id] ?? "#FFFFFF",
      descricao: m.nivelEstrategico,
      is_custom: false,
    });
    seen.add(key);
  }

  // 2. Disciplinas — conectadas ao seu módulo
  const discKeyPorNome = new Map<string, string>();
  for (const m of modulos) {
    for (const d of m.disciplinas) {
      const key = `disc:${d.id}`;
      nodes.push({
        node_key: key,
        label: d.nome,
        modulo_id: m.id,
        glow_color: moduloGlow[m.id] ?? "#FFFFFF",
        descricao: d.descricaoSimbolica,
        is_custom: false,
      });
      seen.add(key);
      discKeyPorNome.set(d.nome, key);
      edges.push({ source_key: `mod:${m.id}`, target_key: key });
    }
  }

  // 3. Conexões entre disciplinas (declaradas no sofia-data)
  const edgeSet = new Set<string>();
  function pushEdge(a: string, b: string) {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (edgeSet.has(k)) return;
    edgeSet.add(k);
    edges.push({ source_key: a, target_key: b });
  }
  for (const m of modulos) {
    for (const d of m.disciplinas) {
      const origem = `disc:${d.id}`;
      for (const conexaoNome of d.conexoes) {
        const alvo = discKeyPorNome.get(conexaoNome);
        if (alvo) pushEdge(origem, alvo);
      }
    }
  }

  // 4. Convergências (campo emergente)
  for (const c of convergencias) {
    const key = `conv:${c.nome.toLowerCase().replace(/\s+/g, "_")}`;
    nodes.push({
      node_key: key,
      label: c.nome,
      modulo_id: "convergencias",
      glow_color: moduloGlow.convergencias,
      descricao: c.descricao,
      is_custom: false,
    });
    seen.add(key);
    // Conecta cada convergência aos módulos relacionados (heurística simples)
    if (/neuro/i.test(c.nome)) {
      pushEdge(key, "mod:inteligencia_artificial");
      pushEdge(key, "mod:computacao_simbolica");
    } else if (/quantum|quântic/i.test(c.nome)) {
      pushEdge(key, "mod:fisica_quantica");
      pushEdge(key, "mod:inteligencia_artificial");
    } else if (/fundament/i.test(c.nome)) {
      pushEdge(key, "mod:matematica");
      pushEdge(key, "mod:inteligencia_artificial");
      pushEdge(key, "mod:fisica_quantica");
    } else if (/explic/i.test(c.nome)) {
      pushEdge(key, "mod:inteligencia_artificial");
      pushEdge(key, "mod:computacao_simbolica");
    }
  }

  return { nodes, edges };
}
