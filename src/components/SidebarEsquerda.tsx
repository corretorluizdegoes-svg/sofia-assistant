import { useState } from "react";
import { useTranslation } from "react-i18next";
import { modulos } from "@/lib/sofia-data";
import { useProgresso } from "@/hooks/useProgresso";
import { ChevronDown, ChevronRight, Compass, HelpCircle } from "lucide-react";
import { moduloVisual, nivelIcon } from "@/lib/sofia-icons";
import { useCurriculoI18n } from "@/i18n/curriculo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  onAbrirDisciplina: (moduloId: string, disciplina: string) => void;
  variant?: "desktop" | "mobile";
};

export function SidebarEsquerda({ onAbrirDisciplina, variant = "desktop" }: Props) {
  const { t } = useTranslation();
  const curr = useCurriculoI18n();
  const { nivelAtual, proximoNivel, progressoAteProximo, topicosExplorados } = useProgresso();
  const [aberto, setAberto] = useState<string | null>(null);
  const [whatAmIOpen, setWhatAmIOpen] = useState(false);
  const NivelIcon = nivelIcon(nivelAtual.nivel);

  const wrapperClass =
    variant === "mobile"
      ? "flex flex-col gap-4 w-full h-full overflow-y-auto scrollbar-soft pr-1"
      : "hidden lg:flex flex-col gap-4 w-72 shrink-0 h-full overflow-y-auto scrollbar-soft pr-1";

  return (
    <aside className={wrapperClass}>
      {/* Seu Nível */}
      <div className="glass-strong rounded-3xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
            <Compass className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
            <span>{t("sidebar.level")}</span>
          </div>
          <Dialog open={whatAmIOpen} onOpenChange={setWhatAmIOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary px-2.5 py-1 text-[11px] font-medium transition-colors"
                aria-label={t("sidebar.whatAmI")}
              >
                <HelpCircle className="w-3 h-3" strokeWidth={2} />
                <span>{t("sidebar.whatAmI")}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-xl tracking-tight">
                  {t("sidebar.whatAmITitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {t("sidebar.whatAmIBody")}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl tone-blue flex items-center justify-center">
            <NivelIcon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-lg leading-tight text-foreground tracking-tight">{curr.nivelNome(nivelAtual.nome)}</div>
            <div className="text-xs text-slate-500">{t("sidebar.levelOf", { n: nivelAtual.nivel })}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600 leading-relaxed">{nivelAtual.descricao}</p>

        {proximoNivel && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>{t("sidebar.next", { name: curr.nivelNome(proximoNivel.nome) })}</span>
              <span className="font-semibold text-primary">{progressoAteProximo}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all duration-700" style={{ width: `${progressoAteProximo}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Módulos */}
      <div className="glass-card rounded-3xl p-4">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 px-1">
          {t("sidebar.curriculum")}
        </h3>
        <ul className="space-y-1.5">
          {modulos.map((m) => {
            const explorado = topicosExplorados.includes(m.id);
            const expanded = aberto === m.id;
            const { icon: Icon, tone } = moduloVisual(m.id);
            // Progresso por matéria: % de disciplinas tocadas (heurística: se módulo foi detectado, conta como parcial)
            const totalDisc = m.disciplinas.length;
            const tocadas = explorado ? Math.max(1, Math.round(totalDisc * 0.2)) : 0;
            const pct = totalDisc > 0 ? Math.round((tocadas / totalDisc) * 100) : 0;
            return (
              <li key={m.id}>
                <button
                  onClick={() => setAberto(expanded ? null : m.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition-all text-left hover:scale-[1.01] ${
                    explorado
                      ? "bg-primary/5 border border-primary/15"
                      : "bg-white/50 border border-transparent hover:bg-white/80"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl ${tone} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{curr.moduloNome(m.id, m.nome)}</div>
                    <div className="text-[11px] text-slate-500">{curr.nivelEstrategico(m.nivelEstrategico)}</div>
                    {/* Barra de progresso por matéria */}
                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  )}
                </button>
                {expanded && (
                  <ul className="mt-1 ml-5 pl-4 border-l-2 border-primary/20 space-y-0.5 animate-fade-in">
                    {m.disciplinas.map((d) => (
                      <li key={d.id}>
                        <button
                          onClick={() => onAbrirDisciplina(m.id, d.nome)}
                          className="w-full text-left text-xs text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg px-2.5 py-2 transition-colors flex items-center gap-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-primary/40" />
                          {curr.disciplinaNome(d.nome)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Mapa de progresso */}
      <div className="glass-card rounded-3xl p-5">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">{t("sidebar.map")}</h3>
        <div className="grid grid-cols-5 gap-2">
          {modulos.map((m) => {
            const explorado = topicosExplorados.includes(m.id);
            const { icon: Icon, tone } = moduloVisual(m.id);
            return (
              <div
                key={m.id}
                title={curr.moduloNome(m.id, m.nome)}
                className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                  explorado ? "bg-gradient-primary text-white shadow-soft" : `${tone} opacity-60`
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          {t("sidebar.mapHint")}
        </p>
      </div>
    </aside>
  );
}
