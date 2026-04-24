import { useTranslation } from "react-i18next";

/**
 * Tradução leve dos rótulos do currículo (módulos, disciplinas, convergências, níveis).
 * Mantém o português como fallback. Edição centralizada aqui evita inflar os JSONs de UI.
 */

type Dict = Record<string, Partial<Record<string, string>>>;

// Por id de módulo
const MODULOS: Dict = {
  matematica:               { en: "Mathematics", es: "Matemáticas", fr: "Mathématiques", de: "Mathematik", it: "Matematica", ja: "数学", zh: "数学", ru: "Математика", ar: "الرياضيات" },
  computacao:               { en: "Computing", es: "Computación", fr: "Informatique", de: "Informatik", it: "Informatica", ja: "計算機科学", zh: "计算机", ru: "Информатика", ar: "الحوسبة" },
  inteligencia_artificial:  { en: "Artificial Intelligence", es: "Inteligencia Artificial", fr: "Intelligence Artificielle", de: "Künstliche Intelligenz", it: "Intelligenza Artificiale", ja: "人工知能", zh: "人工智能", ru: "Искусственный интеллект", ar: "الذكاء الاصطناعي" },
  computacao_simbolica:     { en: "Symbolic Computing", es: "Computación Simbólica", fr: "Calcul Symbolique", de: "Symbolische Berechnung", it: "Calcolo Simbolico", ja: "記号計算", zh: "符号计算", ru: "Символьные вычисления", ar: "الحوسبة الرمزية" },
  fisica_quantica:          { en: "Quantum Physics", es: "Física Cuántica", fr: "Physique Quantique", de: "Quantenphysik", it: "Fisica Quantistica", ja: "量子物理学", zh: "量子物理", ru: "Квантовая физика", ar: "الفيزياء الكمومية" },
  convergencias:            { en: "Advanced Convergences", es: "Convergencias Avanzadas", fr: "Convergences Avancées", de: "Fortgeschrittene Konvergenzen", it: "Convergenze Avanzate", ja: "高次収束", zh: "进阶融合", ru: "Передовые конвергенции", ar: "تقاطعات متقدّمة" },
};

// Níveis estratégicos
const NIVEL_ESTRATEGICO: Dict = {
  "Fundação":          { en: "Foundation", es: "Fundación", fr: "Fondation", de: "Fundament", it: "Fondazione", ja: "基盤", zh: "基础", ru: "Основа", ar: "الأساس" },
  "Estrutura":         { en: "Structure", es: "Estructura", fr: "Structure", de: "Struktur", it: "Struttura", ja: "構造", zh: "结构", ru: "Структура", ar: "البنية" },
  "Inteligência":      { en: "Intelligence", es: "Inteligencia", fr: "Intelligence", de: "Intelligenz", it: "Intelligenza", ja: "知性", zh: "智能", ru: "Интеллект", ar: "الذكاء" },
  "Interpretabilidade":{ en: "Interpretability", es: "Interpretabilidad", fr: "Interprétabilité", de: "Interpretierbarkeit", it: "Interpretabilità", ja: "解釈可能性", zh: "可解释性", ru: "Интерпретируемость", ar: "قابلية التفسير" },
  "Fronteira":         { en: "Frontier", es: "Frontera", fr: "Frontière", de: "Grenze", it: "Frontiera", ja: "最前線", zh: "前沿", ru: "Граница", ar: "الحدود" },
};

// Disciplinas — mapeadas pelo nome PT
const DISCIPLINAS: Dict = {
  "Cálculo I":                            { en: "Calculus I", es: "Cálculo I", fr: "Analyse I", de: "Analysis I", it: "Analisi I", ja: "微積分 I", zh: "微积分 I", ru: "Математический анализ I", ar: "التفاضل والتكامل I" },
  "Cálculo II":                           { en: "Calculus II", es: "Cálculo II", fr: "Analyse II", de: "Analysis II", it: "Analisi II", ja: "微積分 II", zh: "微积分 II", ru: "Анализ II", ar: "التفاضل والتكامل II" },
  "Cálculo III":                          { en: "Calculus III", es: "Cálculo III", fr: "Analyse III", de: "Analysis III", it: "Analisi III", ja: "微積分 III", zh: "微积分 III", ru: "Анализ III", ar: "التفاضل والتكامل III" },
  "Álgebra Linear":                       { en: "Linear Algebra", es: "Álgebra Lineal", fr: "Algèbre Linéaire", de: "Lineare Algebra", it: "Algebra Lineare", ja: "線形代数", zh: "线性代数", ru: "Линейная алгебра", ar: "الجبر الخطي" },
  "Probabilidade e Estatística":          { en: "Probability and Statistics", es: "Probabilidad y Estadística", fr: "Probabilités et Statistiques", de: "Wahrscheinlichkeit und Statistik", it: "Probabilità e Statistica", ja: "確率と統計", zh: "概率与统计", ru: "Вероятность и статистика", ar: "الاحتمالات والإحصاء" },
  "Otimização":                           { en: "Optimization", es: "Optimización", fr: "Optimisation", de: "Optimierung", it: "Ottimizzazione", ja: "最適化", zh: "优化", ru: "Оптимизация", ar: "التحسين" },
  "Métodos Numéricos":                    { en: "Numerical Methods", es: "Métodos Numéricos", fr: "Méthodes Numériques", de: "Numerische Methoden", it: "Metodi Numerici", ja: "数値解法", zh: "数值方法", ru: "Численные методы", ar: "الطرق العددية" },
  "Teoria da Informação":                 { en: "Information Theory", es: "Teoría de la Información", fr: "Théorie de l'Information", de: "Informationstheorie", it: "Teoria dell'Informazione", ja: "情報理論", zh: "信息论", ru: "Теория информации", ar: "نظرية المعلومات" },
  "Algoritmos e Estruturas de Dados":     { en: "Algorithms & Data Structures", es: "Algoritmos y Estructuras de Datos", fr: "Algorithmes et Structures de Données", de: "Algorithmen und Datenstrukturen", it: "Algoritmi e Strutture Dati", ja: "アルゴリズムとデータ構造", zh: "算法与数据结构", ru: "Алгоритмы и структуры данных", ar: "الخوارزميات وهياكل البيانات" },
  "Arquitetura de Computadores":          { en: "Computer Architecture", es: "Arquitectura de Computadoras", fr: "Architecture des Ordinateurs", de: "Rechnerarchitektur", it: "Architettura dei Calcolatori", ja: "コンピュータアーキテクチャ", zh: "计算机体系结构", ru: "Архитектура компьютеров", ar: "معمارية الحاسوب" },
  "Sistemas Operacionais":                { en: "Operating Systems", es: "Sistemas Operativos", fr: "Systèmes d'Exploitation", de: "Betriebssysteme", it: "Sistemi Operativi", ja: "オペレーティングシステム", zh: "操作系统", ru: "Операционные системы", ar: "أنظمة التشغيل" },
  "Redes de Computadores":                { en: "Computer Networks", es: "Redes de Computadoras", fr: "Réseaux Informatiques", de: "Rechnernetze", it: "Reti di Calcolatori", ja: "コンピュータネットワーク", zh: "计算机网络", ru: "Компьютерные сети", ar: "شبكات الحاسوب" },
  "Engenharia de Software":               { en: "Software Engineering", es: "Ingeniería de Software", fr: "Génie Logiciel", de: "Softwaretechnik", it: "Ingegneria del Software", ja: "ソフトウェア工学", zh: "软件工程", ru: "Программная инженерия", ar: "هندسة البرمجيات" },
  "Teoria da Computação":                 { en: "Theory of Computation", es: "Teoría de la Computación", fr: "Théorie de la Calculabilité", de: "Theoretische Informatik", it: "Teoria della Computazione", ja: "計算理論", zh: "计算理论", ru: "Теория вычислений", ar: "نظرية الحوسبة" },
  "Machine Learning":                     { en: "Machine Learning", es: "Aprendizaje Automático", fr: "Apprentissage Automatique", de: "Maschinelles Lernen", it: "Apprendimento Automatico", ja: "機械学習", zh: "机器学习", ru: "Машинное обучение", ar: "تعلّم الآلة" },
  "Deep Learning":                        { en: "Deep Learning", es: "Aprendizaje Profundo", fr: "Apprentissage Profond", de: "Tiefes Lernen", it: "Apprendimento Profondo", ja: "深層学習", zh: "深度学习", ru: "Глубокое обучение", ar: "التعلّم العميق" },
  "Processamento de Linguagem Natural":   { en: "Natural Language Processing", es: "Procesamiento de Lenguaje Natural", fr: "Traitement du Langage Naturel", de: "Verarbeitung Natürlicher Sprache", it: "Elaborazione del Linguaggio Naturale", ja: "自然言語処理", zh: "自然语言处理", ru: "Обработка естественного языка", ar: "معالجة اللغة الطبيعية" },
  "Visão Computacional":                  { en: "Computer Vision", es: "Visión por Computadora", fr: "Vision par Ordinateur", de: "Computer Vision", it: "Visione Artificiale", ja: "コンピュータビジョン", zh: "计算机视觉", ru: "Компьютерное зрение", ar: "الرؤية الحاسوبية" },
  "Robótica":                             { en: "Robotics", es: "Robótica", fr: "Robotique", de: "Robotik", it: "Robotica", ja: "ロボティクス", zh: "机器人学", ru: "Робототехника", ar: "علم الروبوتات" },
  "Sistemas Inteligentes":                { en: "Intelligent Systems", es: "Sistemas Inteligentes", fr: "Systèmes Intelligents", de: "Intelligente Systeme", it: "Sistemi Intelligenti", ja: "知的システム", zh: "智能系统", ru: "Интеллектуальные системы", ar: "الأنظمة الذكية" },
  "Lógica Matemática":                    { en: "Mathematical Logic", es: "Lógica Matemática", fr: "Logique Mathématique", de: "Mathematische Logik", it: "Logica Matematica", ja: "数理論理学", zh: "数理逻辑", ru: "Математическая логика", ar: "المنطق الرياضي" },
  "Linguagens Formais e Autômatos":       { en: "Formal Languages & Automata", es: "Lenguajes Formales y Autómatas", fr: "Langages Formels et Automates", de: "Formale Sprachen und Automaten", it: "Linguaggi Formali e Automi", ja: "形式言語とオートマトン", zh: "形式语言与自动机", ru: "Формальные языки и автоматы", ar: "اللغات الصورية والمكنات" },
  "Sistemas Baseados em Conhecimento":    { en: "Knowledge-Based Systems", es: "Sistemas Basados en Conocimiento", fr: "Systèmes à Base de Connaissances", de: "Wissensbasierte Systeme", it: "Sistemi Basati sulla Conoscenza", ja: "知識ベースシステム", zh: "知识库系统", ru: "Системы, основанные на знаниях", ar: "الأنظمة القائمة على المعرفة" },
  "Raciocínio Automático":                { en: "Automated Reasoning", es: "Razonamiento Automático", fr: "Raisonnement Automatique", de: "Automatisches Schließen", it: "Ragionamento Automatico", ja: "自動推論", zh: "自动推理", ru: "Автоматическое рассуждение", ar: "الاستدلال الآلي" },
  "Representação do Conhecimento":        { en: "Knowledge Representation", es: "Representación del Conocimiento", fr: "Représentation des Connaissances", de: "Wissensrepräsentation", it: "Rappresentazione della Conoscenza", ja: "知識表現", zh: "知识表示", ru: "Представление знаний", ar: "تمثيل المعرفة" },
  "Programação Lógica — Prolog":          { en: "Logic Programming — Prolog", es: "Programación Lógica — Prolog", fr: "Programmation Logique — Prolog", de: "Logikprogrammierung — Prolog", it: "Programmazione Logica — Prolog", ja: "論理プログラミング — Prolog", zh: "逻辑编程 — Prolog", ru: "Логическое программирование — Prolog", ar: "البرمجة المنطقية — برولوغ" },
  "Mecânica Quântica":                    { en: "Quantum Mechanics", es: "Mecánica Cuántica", fr: "Mécanique Quantique", de: "Quantenmechanik", it: "Meccanica Quantistica", ja: "量子力学", zh: "量子力学", ru: "Квантовая механика", ar: "الميكانيكا الكمومية" },
  "Computação Quântica":                  { en: "Quantum Computing", es: "Computación Cuántica", fr: "Calcul Quantique", de: "Quantencomputing", it: "Calcolo Quantistico", ja: "量子計算", zh: "量子计算", ru: "Квантовые вычисления", ar: "الحوسبة الكمومية" },
  "Informação Quântica":                  { en: "Quantum Information", es: "Información Cuántica", fr: "Information Quantique", de: "Quanteninformation", it: "Informazione Quantistica", ja: "量子情報", zh: "量子信息", ru: "Квантовая информация", ar: "المعلومات الكمومية" },
  "Álgebra Linear Avançada":              { en: "Advanced Linear Algebra", es: "Álgebra Lineal Avanzada", fr: "Algèbre Linéaire Avancée", de: "Fortgeschrittene Lineare Algebra", it: "Algebra Lineare Avanzata", ja: "発展線形代数", zh: "高级线性代数", ru: "Продвинутая линейная алгебра", ar: "الجبر الخطي المتقدم" },
  "Probabilidade Quântica":               { en: "Quantum Probability", es: "Probabilidad Cuántica", fr: "Probabilité Quantique", de: "Quantenwahrscheinlichkeit", it: "Probabilità Quantistica", ja: "量子確率", zh: "量子概率", ru: "Квантовая вероятность", ar: "الاحتمالات الكمومية" },
};

const CONVERG: Dict = {
  "IA Neuro-Simbólica":   { en: "Neuro-Symbolic AI", es: "IA Neuro-Simbólica", fr: "IA Neuro-Symbolique", de: "Neuro-Symbolische KI", it: "IA Neuro-Simbolica", ja: "ニューロシンボリック AI", zh: "神经符号 AI", ru: "Нейро-символический ИИ", ar: "ذكاء اصطناعي عصبي رمزي" },
  "Quantum Machine Learning": { en: "Quantum Machine Learning", es: "Aprendizaje Cuántico", fr: "Apprentissage Quantique", de: "Quantenmaschinelles Lernen", it: "Quantum Machine Learning", ja: "量子機械学習", zh: "量子机器学习", ru: "Квантовое машинное обучение", ar: "تعلم الآلة الكمومي" },
  "Modelos Fundamentais": { en: "Foundation Models", es: "Modelos Fundacionales", fr: "Modèles Fondationnels", de: "Foundation-Modelle", it: "Modelli Fondazionali", ja: "基盤モデル", zh: "基础模型", ru: "Фундаментальные модели", ar: "النماذج الأساسية" },
  "IA Explicável":        { en: "Explainable AI", es: "IA Explicable", fr: "IA Explicable", de: "Erklärbare KI", it: "IA Spiegabile", ja: "説明可能 AI", zh: "可解释 AI", ru: "Объяснимый ИИ", ar: "ذكاء اصطناعي قابل للتفسير" },
};

// Níveis (Aprendiz, Mestre…)
const NIVEIS: Dict = {
  "Associado":   { en: "Associate", es: "Asociado", fr: "Associé", de: "Mitwanderer", it: "Associato", ja: "アソシエイト", zh: "学伴", ru: "Помощник", ar: "مرافق" },
  "Aprendiz":    { en: "Apprentice", es: "Aprendiz", fr: "Apprenti", de: "Lehrling", it: "Apprendista", ja: "見習い", zh: "学徒", ru: "Подмастерье", ar: "متدرّب" },
  "Companheiro": { en: "Companion", es: "Compañero", fr: "Compagnon", de: "Gefährte", it: "Compagno", ja: "同伴者", zh: "同行者", ru: "Спутник", ar: "رفيق" },
  "Mestre":      { en: "Master", es: "Maestro", fr: "Maître", de: "Meister", it: "Maestro", ja: "マスター", zh: "宗师", ru: "Мастер", ar: "أستاذ" },
  "Comandante":  { en: "Commander", es: "Comandante", fr: "Commandant", de: "Kommandant", it: "Comandante", ja: "コマンダー", zh: "指挥者", ru: "Командир", ar: "قائد" },
};

function pick(dict: Dict, key: string, lng: string, fallback: string): string {
  return dict[key]?.[lng] ?? fallback;
}

export function useCurriculoI18n() {
  const { i18n } = useTranslation();
  const lng = i18n.language || "pt";

  return {
    moduloNome: (id: string, fallback: string) => pick(MODULOS, id, lng, fallback),
    nivelEstrategico: (pt: string) => pick(NIVEL_ESTRATEGICO, pt, lng, pt),
    disciplinaNome: (ptName: string) => pick(DISCIPLINAS, ptName, lng, ptName),
    convergencia: (ptName: string) => pick(CONVERG, ptName, lng, ptName),
    nivelNome: (ptName: string) => pick(NIVEIS, ptName, lng, ptName),
  };
}

// Versão fora-do-componente
export function translateLabel(label: string, lng: string): string {
  return (
    DISCIPLINAS[label]?.[lng] ??
    CONVERG[label]?.[lng] ??
    MODULOS[label]?.[lng] ??
    label
  );
}
