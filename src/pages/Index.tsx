import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatSofia } from "@/components/ChatSofia";
import { SidebarEsquerda } from "@/components/SidebarEsquerda";
import { SidebarDireita } from "@/components/SidebarDireita";
import { DisciplinaPanel } from "@/components/DisciplinaPanel";
import { BottomNav, MobileTab } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserAvatar } from "@/components/UserAvatar";
import { useProgresso } from "@/hooks/useProgresso";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useProfile, isProfileCompleto } from "@/hooks/useProfile";
import { useCurriculoI18n } from "@/i18n/curriculo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { nivelIcon } from "@/lib/sofia-icons";

const Index = () => {
  const { t } = useTranslation();
  useLanguagePreference(); // sincroniza preferência
  const curr = useCurriculoI18n();
  const navigate = useNavigate();
  const { nivelAtual } = useProgresso();
  const { signOut } = useAuth();
  const { profile, nome } = useProfile();
  const NivelIcon = nivelIcon(nivelAtual.nivel);
  const perfilIncompleto = !isProfileCompleto(profile);

  const [painelAberto, setPainelAberto] = useState(false);
  const [moduloId, setModuloId] = useState<string | null>(null);
  const [disciplina, setDisciplina] = useState<string | null>(null);
  const [startMessage, setStartMessage] = useState<string | null>(null);

  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>("mentor");
  const [mobileSheet, setMobileSheet] = useState<null | "curriculo" | "perfil">(null);

  function abrirDisciplina(mid: string, disc: string) {
    setModuloId(mid);
    setDisciplina(disc);
    setPainelAberto(true);
    setMobileSheet(null);
  }

  function estudarDisciplina(_mid: string, disc: string) {
    setPainelAberto(false);
    setStartMessage(t("chat.studyOpen", { disc: curr.disciplinaNome(disc) }));
    setMobileTab("mentor");
  }

  function verNoMapa(_mid: string, disc: string) {
    setPainelAberto(false);
    navigate(`/mapa-mental?focus=${encodeURIComponent(disc)}`);
  }

  function handleMobileTab(tab: MobileTab) {
    setMobileTab(tab);
    if (tab === "curriculo") setMobileSheet("curriculo");
    else if (tab === "perfil") setMobileSheet("perfil");
    else setMobileSheet(null);
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Top bar */}
      <header className="w-full px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 glass-card rounded-full px-3.5 py-1.5">
          <NivelIcon className="w-4 h-4 text-primary" strokeWidth={1.75} />
          <span className="text-xs uppercase tracking-wider text-slate-500 hidden sm:inline">{t("header.yourLevel")}</span>
          <span className="text-sm font-semibold text-foreground">{curr.nivelNome(nivelAtual.nome)}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/mapa-mental"
            className="hidden sm:inline-flex items-center gap-2 glass-card rounded-full px-3.5 py-1.5 text-sm text-foreground hover:shadow-soft transition-all"
            title={t("header.mindMap")}
          >
            <span aria-hidden>🌌</span>
            <span className="font-medium">{t("header.mindMap")}</span>
          </Link>
          <LanguageSwitcher />
          <Link
            to="/perfil"
            className="flex items-center gap-2.5 group"
            title={t("header.openProfile")}
          >
            <div className="relative">
              <UserAvatar profile={profile} size={36} ring />
              {perfilIncompleto && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-card animate-pulse"
                  title={t("header.profileIncomplete")}
                />
              )}
            </div>
            <div className="hidden sm:block text-right leading-tight">
              <div className="font-display font-bold text-sm text-foreground tracking-tight max-w-[160px] truncate group-hover:text-primary transition-colors">
                {nome}
              </div>
              <div className="text-[10px] text-slate-500">
                {t("header.viewProfile")}
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title={t("header.logout")}
            className="text-slate-500 rounded-full"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>
      </header>

      {/* Layout principal */}
      <main className="flex-1 w-full px-3 sm:px-6 pb-4 lg:pb-4 min-h-0">
        <div className="mx-auto w-full max-w-[1480px] h-[calc(100vh-88px)] flex gap-4 pb-20 lg:pb-0">
          <SidebarEsquerda onAbrirDisciplina={abrirDisciplina} />
          <ChatSofia
            startMessage={startMessage}
            onConsumeStartMessage={() => setStartMessage(null)}
          />
          <SidebarDireita />
        </div>
      </main>

      {/* Bottom Nav (mobile) */}
      <BottomNav active={mobileTab} onChange={handleMobileTab} />

      {/* Mobile sheets */}
      <Sheet open={mobileSheet === "curriculo"} onOpenChange={(o) => !o && (setMobileSheet(null), setMobileTab("mentor"))}>
        <SheetContent side="left" className="w-[88vw] sm:max-w-sm bg-gradient-to-br from-[#F0F7FF] to-white p-4 overflow-y-auto">
          <SidebarEsquerda onAbrirDisciplina={abrirDisciplina} variant="mobile" />
        </SheetContent>
      </Sheet>
      <Sheet open={mobileSheet === "perfil"} onOpenChange={(o) => !o && (setMobileSheet(null), setMobileTab("mentor"))}>
        <SheetContent side="right" className="w-[88vw] sm:max-w-sm bg-gradient-to-br from-[#F0F7FF] to-white p-4 overflow-y-auto">
          <SidebarDireita variant="mobile" />
        </SheetContent>
      </Sheet>

      <DisciplinaPanel
        open={painelAberto}
        onOpenChange={setPainelAberto}
        moduloId={moduloId}
        disciplina={disciplina}
        onEstudar={estudarDisciplina}
        onVerNoMapa={verNoMapa}
      />
    </div>
  );
};

export default Index;
