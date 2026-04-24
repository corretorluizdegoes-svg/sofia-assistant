import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FlowBackground } from "@/components/FlowBackground";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowRight, Sparkles } from "lucide-react";
import sofiaAvatarUrl from "@/assets/sofia-avatar.png";
import { SofiaAvatar3D } from "@/components/SofiaAvatar3D";

export default function Landing() {
  const { t } = useTranslation();
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F0F7FF] via-white to-[#F0F7FF]">
      <FlowBackground />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2.5 font-display font-bold text-foreground tracking-tight">
          <img
            src={sofiaAvatarUrl}
            alt="S.O.F.I.A."
            className="w-9 h-9 rounded-2xl object-cover shadow-soft ring-1 ring-primary/20"
          />
          <span>S.O.F.I.A.</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/saiba-mais" className="text-sm text-slate-500 hover:text-primary transition-colors">
            {t("landing.menuLearnMore")}
          </Link>
        </div>
      </header>

      <section className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 pt-10 sm:pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-subtle text-xs text-slate-600 mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
          {t("landing.tagline")}
        </div>

        <div className="flex justify-center mb-6">
          <SofiaAvatar3D size={220} className="drop-shadow-[0_10px_40px_hsl(var(--primary)/0.35)]" />
        </div>

        <h1 className="font-display font-bold text-5xl sm:text-7xl text-foreground tracking-tight">S.O.F.I.A.</h1>
        <p className="mt-4 text-base sm:text-lg text-slate-500 italic">{t("landing.subtitle")}</p>

        <p className="mt-10 text-lg sm:text-xl leading-relaxed text-slate-700 max-w-2xl mx-auto">
          <Trans
            i18nKey="landing.intro1"
            values={{ found: t("landing.found") }}
            components={{ 1: <span className="text-primary font-semibold" /> } as never}
          >
            {t("landing.intro1", { found: t("landing.found") })}
          </Trans>
        </p>

        <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl mx-auto">
          {t("landing.intro2")}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary text-white hover:shadow-glow transition-all px-8 rounded-full h-12 hover:scale-105">
            <Link to="/auth?mode=signup">
              {t("landing.ctaStart")}
              <ArrowRight className="ml-1 w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-white/70 backdrop-blur-sm border-white hover:bg-white px-8 rounded-full h-12">
            <Link to="/auth?mode=login">{t("landing.ctaLogin")}</Link>
          </Button>
        </div>

        <Link to="/saiba-mais" className="mt-8 inline-block text-sm text-slate-500 hover:text-primary underline-offset-4 hover:underline">
          {t("landing.learnMore")}
        </Link>
      </section>
    </main>
  );
}
