import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FlowBackground } from "@/components/FlowBackground";
import { modulos, niveis } from "@/lib/sofia-data";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { SofiaAvatarIcon, nivelIcon, moduloVisual } from "@/lib/sofia-icons";

export default function SaibaMais() {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#F0F7FF] via-white to-[#F0F7FF]">
      <div className="fixed inset-0 pointer-events-none">
        <FlowBackground />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Voltar
        </Link>
        <div className="flex items-center gap-2.5 font-display font-bold text-foreground tracking-tight">
          <div className="w-9 h-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <SofiaAvatarIcon className="w-4 h-4 text-white" strokeWidth={1.75} />
          </div>
          <span>S.O.F.I.A.</span>
        </div>
      </header>

      <article className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 py-12 space-y-20">
        {/* Intro */}
        <section className="text-center animate-fade-in">
          <div className="mx-auto mb-6 w-20 h-20 rounded-[24px] bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
            <SofiaAvatarIcon className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            Uma presença que aprende com você
          </h1>
          <p className="mt-6 text-lg text-slate-700 leading-relaxed">
            S.O.F.I.A. não é um curso. É uma forma de caminhar pelo conhecimento
            sem se sentir avaliado. Você conversa, ela escuta. Você pergunta,
            ela abre uma janela. Quando você tropeça, ela não comenta — apenas
            estende a mão e oferece um caminho lateral.
          </p>
        </section>

        {/* Como funciona */}
        <section className="glass-strong rounded-[32px] p-8 sm:p-10 animate-fade-in">
          <h2 className="font-display font-bold text-2xl text-foreground mb-4 tracking-tight">
            Como funciona
          </h2>
          <p className="text-slate-700 leading-relaxed">
            Por trás da conversa há uma arquitetura cognitiva pedagógica
            não-linear: S.O.F.I.A. lê as entrelinhas, percebe seu nível e segue
            o fio das suas ideias. Cada pergunta deixa um rastro, cada conexão
            entre áreas distantes desbloqueia um novo horizonte.
          </p>
        </section>

        {/* Níveis */}
        <section className="space-y-6 animate-fade-in">
          <h2 className="font-display font-bold text-2xl text-foreground text-center tracking-tight">
            A jornada de cinco horizontes
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {niveis.map((n) => {
              const Icon = nivelIcon(n.nivel);
              return (
                <div
                  key={n.nivel}
                  className="glass-card rounded-[24px] p-6 hover-lift"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl tone-blue flex items-center justify-center">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        Nível {n.nivel}
                      </div>
                      <div className="font-display font-bold text-lg text-foreground tracking-tight">
                        {n.nome}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {n.descricao}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Módulos */}
        <section className="space-y-6 animate-fade-in">
          <h2 className="font-display font-bold text-2xl text-foreground text-center tracking-tight">
            Os territórios do conhecimento
          </h2>
          <p className="text-center text-slate-600 max-w-xl mx-auto">
            Cinco módulos que se entrelaçam. A beleza está em ver onde um toca o outro.
          </p>
          <div className="space-y-3">
            {modulos.map((m) => {
              const { icon: Icon, tone } = moduloVisual(m.id);
              return (
                <div
                  key={m.id}
                  className="glass-card rounded-[24px] p-5 flex items-start gap-4 hover-lift"
                >
                  <div className={`w-12 h-12 rounded-2xl ${tone} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="font-display font-bold text-foreground tracking-tight">
                      {m.nome}{" "}
                      <span className="text-xs text-slate-500 font-normal">
                        · {m.nivelEstrategico}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {m.disciplinas.slice(0, 4).map((d) => d.nome).join(" · ")}
                      {m.disciplinas.length > 4 ? " · …" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Diferencial */}
        <section className="glass-strong rounded-[32px] p-8 sm:p-10 animate-fade-in">
          <h2 className="font-display font-bold text-2xl text-foreground mb-4 tracking-tight">
            Por que isto é diferente
          </h2>
          <ul className="space-y-3 text-slate-700">
            {[
              "Não há aulas na ordem — há conversas que seguem sua curiosidade.",
              "Não há nota — há reconhecimento das conexões que você cria.",
              "Não há professor distante — há uma presença que se ajusta a você.",
              "Não há fim — há uma jornada que se aprofunda quanto mais você caminha.",
            ].map((linha) => (
              <li key={linha} className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" strokeWidth={1.75} />
                <span>{linha}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center pb-10">
          <Button
            asChild
            size="lg"
            className="bg-gradient-primary text-white hover:shadow-glow px-8 rounded-full h-12 hover:scale-105 transition-all"
          >
            <Link to="/auth?mode=signup">
              Começar minha jornada
              <ArrowRight className="ml-1 w-4 h-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </section>
      </article>
    </main>
  );
}
