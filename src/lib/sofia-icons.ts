import {
  Sigma, Cpu, Brain, Network, Atom,
  Sprout, Search, Link2, Telescope, Rocket,
  Sparkles, Leaf, Trophy, Waves,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

// ─── Módulos ────────────────────────────────────────────────
export type ModuloVisual = { icon: LucideIcon; tone: string };

export const moduloIcones: Record<string, ModuloVisual> = {
  matematica:               { icon: Sigma,   tone: "tone-blue" },
  computacao:               { icon: Cpu,     tone: "tone-violet" },
  inteligencia_artificial:  { icon: Brain,   tone: "tone-emerald" },
  computacao_simbolica:     { icon: Network, tone: "tone-amber" },
  fisica_quantica:          { icon: Atom,    tone: "tone-cyan" },
};

export function moduloVisual(id: string): ModuloVisual {
  return moduloIcones[id] ?? { icon: Sparkles, tone: "tone-blue" };
}

// ─── Níveis (10) ────────────────────────────────────────────
// Cada level reaproveita o ícone da sua patente.
export const nivelIcones: Record<number, LucideIcon> = {
  1: Sprout,    2: Sprout,
  3: Search,    4: Search,
  5: Link2,     6: Link2,
  7: Telescope, 8: Telescope,
  9: Rocket,    10: Rocket,
};

export function nivelIcon(nivel: number): LucideIcon {
  return nivelIcones[nivel] ?? Sprout;
}

// ─── Conquistas ─────────────────────────────────────────────
export const conquistaIcones: Record<string, { icon: LucideIcon; tone: string }> = {
  primeira_pergunta:    { icon: Sparkles, tone: "tone-amber" },
  tres_topicos:         { icon: Leaf,     tone: "tone-emerald" },
  conexao_entre_areas:  { icon: Link2,    tone: "tone-violet" },
  subiu_nivel:          { icon: Trophy,   tone: "tone-amber" },
  sessao_profunda:      { icon: Waves,    tone: "tone-cyan" },
};

export function conquistaVisual(id: string) {
  return conquistaIcones[id] ?? { icon: Sparkles, tone: "tone-blue" };
}

// ─── Avatar S.O.F.I.A. ──────────────────────────────────────
export const SofiaAvatarIcon = GraduationCap;
