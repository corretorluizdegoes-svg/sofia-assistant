export type Disciplina = {
  id: string;
  nome: string;
  descricaoSimbolica: string;
  conexoes: string[];
};

export type Modulo = {
  id: string;
  nome: string;
  emoji: string;
  nivelEstrategico: string;
  disciplinas: Disciplina[];
};

export const modulos: Modulo[] = [
  {
    id: "matematica",
    nome: "Matemática",
    emoji: "📐",
    nivelEstrategico: "Fundação",
    disciplinas: [
      { id: "calculo_1", nome: "Cálculo I", descricaoSimbolica: "O estudo da mudança. Como entender que tudo no universo está em movimento — e que existe uma linguagem para descrever esse movimento com precisão.", conexoes: ["Cálculo II", "Otimização", "Machine Learning"] },
      { id: "calculo_2", nome: "Cálculo II", descricaoSimbolica: "A continuação da conversa sobre mudança — agora em profundidade. Áreas, volumes, acumulações. O mundo que existe entre os instantes.", conexoes: ["Cálculo III", "Métodos Numéricos", "Deep Learning"] },
      { id: "calculo_3", nome: "Cálculo III", descricaoSimbolica: "Quando a mudança acontece em múltiplas direções ao mesmo tempo. O mapa do território em várias dimensões.", conexoes: ["Álgebra Linear", "Visão Computacional", "Física Quântica"] },
      { id: "algebra_linear", nome: "Álgebra Linear", descricaoSimbolica: "A gramática das redes neurais. Aprende aqui e de repente Deep Learning, Visão Computacional e Computação Quântica começam a fazer sentido ao mesmo tempo.", conexoes: ["Machine Learning", "Deep Learning", "Visão Computacional", "Computação Quântica"] },
      { id: "probabilidade_estatistica", nome: "Probabilidade e Estatística", descricaoSimbolica: "A arte de tomar boas decisões com informação incompleta. Como a incerteza deixa de ser inimiga e vira ferramenta.", conexoes: ["Machine Learning", "Inferência Bayesiana", "Processamento de Linguagem Natural"] },
      { id: "otimizacao", nome: "Otimização", descricaoSimbolica: "Encontrar o melhor caminho em um terreno que você mal consegue enxergar. É o coração do treinamento de qualquer modelo de IA.", conexoes: ["Machine Learning", "Deep Learning", "Cálculo I"] },
      { id: "metodos_numericos", nome: "Métodos Numéricos", descricaoSimbolica: "Quando a matemática exata encontra o mundo real imperfeito. Como aproximar com inteligência o que não pode ser resolvido de forma perfeita.", conexoes: ["Cálculo II", "Algoritmos", "Simulações"] },
      { id: "teoria_da_informacao", nome: "Teoria da Informação", descricaoSimbolica: "O que é informação, de verdade? Como medir o que você sabe — e o que ainda não sabe. A base filosófica e matemática de toda comunicação.", conexoes: ["Processamento de Linguagem Natural", "Compressão de Dados", "IA Explicável"] },
    ],
  },
  {
    id: "computacao",
    nome: "Computação",
    emoji: "💻",
    nivelEstrategico: "Estrutura",
    disciplinas: [
      { id: "algoritmos", nome: "Algoritmos e Estruturas de Dados", descricaoSimbolica: "Receitas e armários. Como organizar o que você sabe para encontrar o que precisa — no menor tempo possível.", conexoes: ["Engenharia de Software", "Machine Learning", "Teoria da Computação"] },
      { id: "arquitetura_computadores", nome: "Arquitetura de Computadores", descricaoSimbolica: "O que há dentro da máquina. Como o hardware pensa — e por que isso importa para quem programa a inteligência.", conexoes: ["Sistemas Operacionais", "Computação Quântica"] },
      { id: "sistemas_operacionais", nome: "Sistemas Operacionais", descricaoSimbolica: "O maestro invisível. Coordena tudo sem que você perceba — memória, processos, recursos. A inteligência que gerencia a inteligência.", conexoes: ["Arquitetura de Computadores", "Redes de Computadores"] },
      { id: "redes_computadores", nome: "Redes de Computadores", descricaoSimbolica: "Como as máquinas conversam entre si. A linguagem dos protocolos — e por que a internet funciona da forma que funciona.", conexoes: ["Sistemas Operacionais", "Segurança", "Sistemas Distribuídos"] },
      { id: "engenharia_software", nome: "Engenharia de Software", descricaoSimbolica: "Construir software é como arquitetura — você precisa de planta, estrutura e planejamento antes de erguer as paredes.", conexoes: ["Algoritmos", "Sistemas Inteligentes"] },
      { id: "teoria_computacao", nome: "Teoria da Computação", descricaoSimbolica: "Os limites do que uma máquina pode fazer. Existem problemas que nenhum computador jamais resolverá — e esta disciplina explica por quê.", conexoes: ["Lógica Matemática", "Linguagens Formais", "Algoritmos"] },
    ],
  },
  {
    id: "inteligencia_artificial",
    nome: "Inteligência Artificial",
    emoji: "🤖",
    nivelEstrategico: "Inteligência",
    disciplinas: [
      { id: "machine_learning", nome: "Machine Learning", descricaoSimbolica: "Ensinar uma máquina a aprender com exemplos — sem programar cada regra. Como mostrar mil fotos de gatos até ela entender o que é um gato.", conexoes: ["Deep Learning", "Probabilidade e Estatística", "Álgebra Linear", "Otimização"] },
      { id: "deep_learning", nome: "Deep Learning", descricaoSimbolica: "Camadas sobre camadas de aprendizado. Como o cérebro artificial encontra padrões que nenhum humano conseguiria descrever manualmente.", conexoes: ["Machine Learning", "Visão Computacional", "Processamento de Linguagem Natural"] },
      { id: "nlp", nome: "Processamento de Linguagem Natural", descricaoSimbolica: "Ensinar máquinas a entender — e falar — como humanos. A ponte entre a linguagem viva e o mundo dos dados.", conexoes: ["Deep Learning", "Linguística", "Teoria da Informação", "Lógica"] },
      { id: "visao_computacional", nome: "Visão Computacional", descricaoSimbolica: "Como uma máquina aprende a ver. Reconhecer rostos, objetos, movimentos — tudo a partir de números que representam luz.", conexoes: ["Deep Learning", "Álgebra Linear", "Processamento de Sinais"] },
      { id: "robotica", nome: "Robótica", descricaoSimbolica: "Inteligência que age no mundo físico. Onde o software encontra o hardware — e aprende a se mover, sentir e decidir.", conexoes: ["Visão Computacional", "Machine Learning", "Sistemas de Controle"] },
      { id: "sistemas_inteligentes", nome: "Sistemas Inteligentes", descricaoSimbolica: "Quando várias formas de inteligência trabalham juntas para resolver problemas complexos. A orquestra completa.", conexoes: ["Machine Learning", "Lógica", "Representação do Conhecimento"] },
    ],
  },
  {
    id: "computacao_simbolica",
    nome: "Computação Simbólica",
    emoji: "🧠",
    nivelEstrategico: "Interpretabilidade",
    disciplinas: [
      { id: "logica_matematica", nome: "Lógica Matemática", descricaoSimbolica: "A espinha dorsal do raciocínio. Verdadeiro, falso, e tudo que se pode deduzir a partir daí. O fundamento de toda inteligência que precisa explicar o que faz.", conexoes: ["Teoria da Computação", "IA Explicável", "Sistemas Baseados em Conhecimento"] },
      { id: "linguagens_formais", nome: "Linguagens Formais e Autômatos", descricaoSimbolica: "Como as linguagens são construídas — e o que as máquinas conseguem entender. A teoria por trás de toda linguagem de programação.", conexoes: ["Teoria da Computação", "Compiladores", "Processamento de Linguagem Natural"] },
      { id: "sistemas_conhecimento", nome: "Sistemas Baseados em Conhecimento", descricaoSimbolica: "Quando a máquina não aprende — ela raciocina. Usa regras, fatos e inferência para chegar a conclusões. Como um detetive, não como um papagaio.", conexoes: ["Lógica Matemática", "IA Explicável", "Representação do Conhecimento"] },
      { id: "raciocinio_automatico", nome: "Raciocínio Automático", descricaoSimbolica: "Máquinas que provam teoremas, resolvem puzzles e constroem argumentos. A inteligência que mostra o próprio trabalho.", conexoes: ["Lógica Matemática", "Sistemas Baseados em Conhecimento"] },
      { id: "representacao_conhecimento", nome: "Representação do Conhecimento", descricaoSimbolica: "Como guardar o que se sabe de um jeito que a máquina possa usar. Ontologias, grafos, redes semânticas — mapas do conhecimento humano.", conexoes: ["IA Explicável", "Sistemas Inteligentes", "Processamento de Linguagem Natural"] },
      { id: "programacao_logica", nome: "Programação Lógica — Prolog", descricaoSimbolica: "Uma linguagem onde você descreve o que é verdade — e a máquina descobre como chegar lá. Programar com lógica pura.", conexoes: ["Lógica Matemática", "Sistemas Baseados em Conhecimento", "Raciocínio Automático"] },
    ],
  },
  {
    id: "fisica_quantica",
    nome: "Física Quântica",
    emoji: "⚛️",
    nivelEstrategico: "Fronteira",
    disciplinas: [
      { id: "mecanica_quantica", nome: "Mecânica Quântica", descricaoSimbolica: "O mundo abaixo do mundo. Onde as partículas existem em vários estados ao mesmo tempo — até alguém olhar. A física que desafia toda intuição.", conexoes: ["Computação Quântica", "Probabilidade Quântica", "Álgebra Linear Avançada"] },
      { id: "computacao_quantica", nome: "Computação Quântica", descricaoSimbolica: "Um computador que pensa em possibilidades ao mesmo tempo, não uma de cada vez. Como resolver labirintos explorando todos os caminhos simultaneamente.", conexoes: ["Mecânica Quântica", "Algoritmos Quânticos", "Quantum Machine Learning"] },
      { id: "informacao_quantica", nome: "Informação Quântica", descricaoSimbolica: "O que significa guardar e transmitir informação quando as regras do universo são completamente diferentes. A nova forma de pensar dados.", conexoes: ["Computação Quântica", "Teoria da Informação", "Criptografia"] },
      { id: "algebra_linear_avancada", nome: "Álgebra Linear Avançada", descricaoSimbolica: "A matemática dos estados quânticos. Espaços de Hilbert, operadores, transformações — o idioma nativo da física quântica.", conexoes: ["Mecânica Quântica", "Computação Quântica", "Deep Learning"] },
      { id: "probabilidade_quantica", nome: "Probabilidade Quântica", descricaoSimbolica: "Probabilidade com regras novas. Onde eventos podem se interferir, se cancelar ou se amplificar — como ondas no oceano do conhecimento.", conexoes: ["Mecânica Quântica", "Probabilidade e Estatística", "Informação Quântica"] },
    ],
  },
];

// Helper: encontra uma disciplina pelo nome
export function encontrarDisciplina(nome: string): { modulo: Modulo; disciplina: Disciplina } | null {
  for (const m of modulos) {
    const d = m.disciplinas.find((x) => x.nome === nome);
    if (d) return { modulo: m, disciplina: d };
  }
  return null;
}

export type Nivel = {
  nivel: number;
  nome: string;
  emoji: string;
  descricao: string;
  xpNecessario: number;
};

// 10 levels — curva decrescente (mais generosa no início)
export const niveis: Nivel[] = [
  { nivel: 1,  nome: "Associado",   emoji: "🌱", descricao: "Está chegando. Começa a reconhecer os primeiros padrões.",          xpNecessario: 0    },
  { nivel: 2,  nome: "Associado",   emoji: "🌱", descricao: "Continua firmando os primeiros vínculos.",                          xpNecessario: 100  },
  { nivel: 3,  nome: "Aprendiz",    emoji: "🔍", descricao: "Já percebe conexões simples entre conceitos próximos.",             xpNecessario: 250  },
  { nivel: 4,  nome: "Aprendiz",    emoji: "🔍", descricao: "Aprofunda a leitura entre áreas vizinhas.",                          xpNecessario: 450  },
  { nivel: 5,  nome: "Companheiro", emoji: "🔗", descricao: "Navega com naturalidade entre diferentes áreas do conhecimento.",   xpNecessario: 700  },
  { nivel: 6,  nome: "Companheiro", emoji: "🔗", descricao: "Cruza territórios distantes com mais coragem.",                      xpNecessario: 1000 },
  { nivel: 7,  nome: "Mestre",      emoji: "🧠", descricao: "Conecta pontos distantes com fluidez e profundidade.",              xpNecessario: 1400 },
  { nivel: 8,  nome: "Mestre",      emoji: "🧠", descricao: "Forja relações onde antes só havia silêncio.",                       xpNecessario: 1900 },
  { nivel: 9,  nome: "Comandante",  emoji: "🚀", descricao: "Domina o fluxo. Cria seus próprios caminhos no conhecimento.",      xpNecessario: 2500 },
  { nivel: 10, nome: "Comandante",  emoji: "🌟", descricao: "MAX LEVEL — o aprendiz tornou-se cartógrafo do próprio universo.",  xpNecessario: 3300 },
];

// Patentes RPG — 1 patente a cada 2 levels
export type Patente = {
  id: "associado" | "aprendiz" | "companheiro" | "mestre" | "comandante";
  nome: string;
  cor: string;       // HSL var-friendly hex
  glow: string;      // box-shadow color
  levels: [number, number];
};

export const patentes: Patente[] = [
  { id: "associado",   nome: "Associado",   cor: "#FFFFFF", glow: "rgba(255,255,255,0.55)", levels: [1, 2] },
  { id: "aprendiz",    nome: "Aprendiz",    cor: "#34D399", glow: "rgba(52,211,153,0.55)",  levels: [3, 4] },
  { id: "companheiro", nome: "Companheiro", cor: "#4DA8FF", glow: "rgba(77,168,255,0.55)",  levels: [5, 6] },
  { id: "mestre",      nome: "Mestre",      cor: "#A78BFA", glow: "rgba(167,139,250,0.55)", levels: [7, 8] },
  { id: "comandante",  nome: "Comandante",  cor: "#F4C152", glow: "rgba(244,193,82,0.65)",  levels: [9, 10] },
];

export function patenteDoLevel(level: number): Patente {
  return patentes.find((p) => level >= p.levels[0] && level <= p.levels[1]) ?? patentes[0];
}

export const convergencias = [
  { nome: "IA Neuro-Simbólica",       emoji: "🔬", descricao: "Redes neurais que aprendem com exemplos, combinadas com lógica que explica o porquê." },
  { nome: "Quantum Machine Learning", emoji: "🌀", descricao: "A velocidade do universo quântico acelerando o aprendizado das máquinas." },
  { nome: "Modelos Fundamentais",     emoji: "🏛️", descricao: "Matemática avançada, física e IA criando sistemas que ninguém compreende totalmente." },
  { nome: "IA Explicável",            emoji: "🔍", descricao: "Inteligência que mostra o próprio raciocínio. Acertar não basta — é preciso explicar." },
];

export const conquistasDisponiveis = [
  { id: "primeira_pergunta",  emoji: "✨", nome: "Primeira Centelha",      descricao: "Iniciou a primeira conversa com S.O.F.I.A." },
  { id: "tres_topicos",       emoji: "🌿", nome: "Curiosidade Florescente", descricao: "Explorou três tópicos diferentes" },
  { id: "conexao_entre_areas",emoji: "🔗", nome: "Conexão Não-Linear",     descricao: "Conectou conceitos de módulos diferentes" },
  { id: "subiu_nivel",        emoji: "🏅", nome: "Novo Horizonte",          descricao: "Avançou para um novo nível na jornada" },
  { id: "sessao_profunda",    emoji: "🧠", nome: "Mergulho Profundo",      descricao: "Sustentou uma conversa longa e coerente" },
];

export const palavrasChavePorModulo: Record<string, string[]> = {
  matematica: ["cálculo", "derivada", "integral", "álgebra", "vetor", "matriz", "probabilidade", "estatística", "otimização", "gradiente", "função"],
  computacao: ["algoritmo", "estrutura de dados", "sistema operacional", "rede", "compilador", "engenharia de software", "complexidade", "grafo", "pilha", "fila"],
  inteligencia_artificial: ["machine learning", "deep learning", "rede neural", "nlp", "visão computacional", "transformer", "modelo", "treinamento", "ia", "inteligência artificial", "llm"],
  computacao_simbolica: ["lógica", "prolog", "autômato", "linguagem formal", "raciocínio", "ontologia", "conhecimento simbólico"],
  fisica_quantica: ["quântica", "qubit", "superposição", "emaranhamento", "quantum", "schrödinger"],
};
