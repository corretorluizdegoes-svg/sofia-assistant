import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useProgresso } from "@/hooks/useProgresso";
import { modulos, conquistasDisponiveis } from "@/lib/sofia-data";
import { Sparkles, Trophy, Telescope, Flame, ArrowRight } from "lucide-react";
import { moduloVisual, conquistaVisual, nivelIcon } from "@/lib/sofia-icons";
import { useCurriculoI18n } from "@/i18n/curriculo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = { variant?: "desktop" | "mobile" };

export function SidebarDireita({ variant = "desktop" }: Props) {
  const { t } = useTranslation();
  const curr = useCurriculoI18n();
  const {
    xp,
    topicosExplorados,
    conquistas,
    nivelAtual,
    patenteAtual,
    proximoNivel,
    progressoAteProximo,
    isMaxLevel,
    streakDias,
    totalMensagens,
  } = useProgresso();
  const NivelIcon = nivelIcon(nivelAtual.nivel);

  // Brilho ao ganhar XP
  const xpRef = useRef(xp);
  const [brilho, setBrilho] = useState(false);
  useEffect(() => {
    if (xp > xpRef.current) {
      setBrilho(true);
      const id = setTimeout(() => setBrilho(false), 1200);
      return () => clearTimeout(id);
    }
    xpRef.current = xp;
  }, [xp]);

  const wrapperClass =
    variant === "mobile"
      ? "flex flex-col gap-4 w-full h-full overflow-y-auto scrollbar-soft pl-1"
      : "hidden xl:flex flex-col gap-4 w-72 shrink-0 h-full overflow-y-auto scrollbar-soft pl-1";

  // Próxima ação sugerida
  const sugestao = (() => {
    if (totalMensagens === 0) {
      return {
        titulo: t("right.firstStep"),
        desc: t("right.firstStepDesc"),
        to: null as string | null,
      };
    }
    if (topicosExplorados.length === 0) {
      return {
        titulo: t("right.exploreTopic"),
        desc: t("right.exploreTopicDesc"),
        to: null as string | null,
      };
    }
    return {
      titulo: t("right.openMap"),
      desc: t("right.openMapDesc"),
      to: "/mapa-mental",
    };
  })();

  // Tons de cor para tags
  const TAG_TONES = ["tone-blue", "tone-violet", "tone-emerald", "tone-amber", "tone-rose", "tone-cyan"];

  return (
    <TooltipProvider delayDuration={150}>
      <aside className={wrapperClass}>
        {/* XP / Level / Patente */}
        <div className={`glass-strong rounded-3xl p-5 transition-all ${brilho ? "shadow-glow" : ""}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-3">
            <Sparkles className={`w-3.5 h-3.5 text-accent ${brilho ? "animate-pulse" : ""}`} strokeWidth={1.75} />
            <span>{t("sidebar.xpTitle")}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-display font-extrabold text-gradient-primary tracking-tight transition-all ${
                brilho ? "scale-110 drop-shadow-[0_0_10px_rgba(74,144,226,0.5)]" : ""
              }`}
            >
              {xp}
            </span>
            <span className="text-sm text-slate-500">{t("sidebar.xpUnit")}</span>
          </div>

          {/* Patente + Level */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
              style={{
                borderColor: patenteAtual.cor,
                color: patenteAtual.cor,
                boxShadow: `0 0 14px ${patenteAtual.glow}`,
                background: "rgba(255,255,255,0.6)",
              }}
            >
              <NivelIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-xs font-semibold">{t(`sidebar.patente.${patenteAtual.id}`)}</span>
            </div>

            {isMaxLevel ? (
              <span
                className="text-xs font-extrabold tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(90deg,#F4C152,#FBE16B,#F4C152)",
                  color: "#3a2a00",
                  boxShadow: "0 0 18px rgba(244,193,82,0.6)",
                  animation: "pulse 2.4s ease-in-out infinite",
                }}
              >
                {t("sidebar.maxLevel")}
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                {t("sidebar.levelLabel", { n: nivelAtual.nivel })}
              </span>
            )}
          </div>

          {/* Barra até o próximo level */}
          {!isMaxLevel && proximoNivel && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>{t("sidebar.nextLevel", { n: proximoNivel.nivel })}</span>
                <span>{xp} / {proximoNivel.xpNecessario}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressoAteProximo}%`,
                    background: `linear-gradient(90deg, ${patenteAtual.cor}, hsl(var(--accent)))`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Streak */}
          {streakDias > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200">
              <Flame className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-xs font-semibold">
                {t("sidebar.streak", { count: streakDias })}
              </span>
            </div>
          )}
        </div>

        {/* Continue de onde parou */}
        {sugestao && (
          <div className="glass-card rounded-3xl p-5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
              {t("right.continueLabel")}
            </div>
            <div className="font-display font-bold text-foreground leading-tight">{sugestao.titulo}</div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{sugestao.desc}</p>
            {sugestao.to && (
              <Link
                to={sugestao.to}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2 transition-all"
              >
                {t("right.goNow")}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            )}
          </div>
        )}

        {/* Tópicos Explorados — tags coloridas */}
        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-3">
            <Telescope className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
            <span>{t("sidebar.topicsTitle")}</span>
          </div>
          {topicosExplorados.length === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">{t("sidebar.topicsEmpty")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topicosExplorados.map((id, i) => {
                const m = modulos.find((x) => x.id === id);
                if (!m) return null;
                const tone = TAG_TONES[i % TAG_TONES.length];
                return (
                  <span
                    key={id}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}
                  >
                    <span aria-hidden>{m.emoji}</span>
                    {curr.moduloNome(id, m.nome)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Conquistas — grade compacta estilo álbum */}
        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-3">
            <Trophy className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
            <span>{t("sidebar.achievements")}</span>
            <span className="ml-auto text-[10px] font-semibold text-slate-400">
              {conquistas.length}/{conquistasDisponiveis.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {conquistasDisponiveis.map((c) => {
              const desbloq = conquistas.includes(c.id);
              const { icon: Icon, tone } = conquistaVisual(c.id);
              return (
                <Tooltip key={c.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`aspect-square rounded-2xl flex items-center justify-center cursor-help transition-all ${
                        desbloq
                          ? "bg-white border border-border/60 shadow-soft hover:scale-110"
                          : "bg-slate-50/70 border border-transparent opacity-50 grayscale hover:opacity-75"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${tone} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    sideOffset={8}
                    collisionPadding={16}
                    avoidCollisions
                    className="max-w-[220px] break-words whitespace-normal z-50"
                  >
                    <div className="font-semibold text-xs">{c.nome}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5 leading-snug break-words">
                      {c.descricao}
                    </div>
                    {!desbloq && (
                      <div className="text-[10px] text-amber-300 mt-1">🔒 {t("right.locked")}</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
