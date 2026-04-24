import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { encontrarDisciplina } from "@/lib/sofia-data";
import { Sparkles, Link2, Compass } from "lucide-react";
import { moduloVisual } from "@/lib/sofia-icons";
import { useCurriculoI18n } from "@/i18n/curriculo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduloId: string | null;
  disciplina: string | null;
  onEstudar: (moduloId: string, disciplina: string) => void;
  onVerNoMapa?: (moduloId: string, disciplina: string) => void;
};

export function DisciplinaPanel({ open, onOpenChange, moduloId, disciplina, onEstudar, onVerNoMapa }: Props) {
  const { t } = useTranslation();
  const curr = useCurriculoI18n();
  const found = disciplina ? encontrarDisciplina(disciplina) : null;
  if (!found || !moduloId) return null;
  const { modulo, disciplina: d } = found;
  const { icon: ModIcon, tone } = moduloVisual(modulo.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-gradient-to-br from-[#F0F7FF] to-white border-l border-border/40">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2.5 mb-1">
            <div className={`w-8 h-8 rounded-xl ${tone} flex items-center justify-center`}>
              <ModIcon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">{curr.moduloNome(modulo.id, modulo.nome)}</div>
              <div className="text-[10px] text-slate-400">{curr.nivelEstrategico(modulo.nivelEstrategico)}</div>
            </div>
          </div>
          <SheetTitle className="font-display font-bold text-2xl text-foreground tracking-tight">
            {curr.disciplinaNome(d.nome)}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {curr.disciplinaNome(d.nome)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              {t("discipline.essence")}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {d.descricaoSimbolica}
            </p>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t("discipline.connections")}
            </h3>
            <ul className="space-y-2">
              {d.conexoes.map((nome) => {
                const alvo = encontrarDisciplina(nome);
                const visual = alvo ? moduloVisual(alvo.modulo.id) : { icon: Link2, tone: "tone-blue" };
                const Icon = visual.icon;
                return (
                  <li
                    key={nome}
                    className="flex items-start gap-3 bg-white/70 rounded-2xl p-3 border border-border/40"
                  >
                    <div className={`w-8 h-8 rounded-lg ${visual.tone} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <div className="text-sm text-slate-700 leading-snug">
                      <span className="font-semibold text-foreground">{curr.disciplinaNome(nome)}</span>
                      {alvo && (
                        <span className="text-slate-500"> — {curr.moduloNome(alvo.modulo.id, alvo.modulo.nome)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="space-y-2">
            <Button
              onClick={() => onEstudar(modulo.id, d.nome)}
              className="w-full bg-gradient-primary text-white hover:shadow-glow rounded-full h-12"
              size="lg"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
              {t("discipline.studyCta")}
            </Button>
            {onVerNoMapa && (
              <Button
                onClick={() => onVerNoMapa(modulo.id, d.nome)}
                variant="outline"
                className="w-full rounded-full h-11 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Compass className="w-4 h-4" strokeWidth={1.75} />
                {t("discipline.viewOnMap")}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
