import { Home, BookOpen, MessageCircle, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type MobileTab = "home" | "curriculo" | "mentor" | "perfil" | "mapa";

type Props = {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
};

export function BottomNav({ active, onChange }: Props) {
  const { t } = useTranslation();
  type Item =
    | { id: Exclude<MobileTab, "mapa" | "perfil">; label: string; icon: typeof Home; kind: "button" }
    | { id: "mapa"; label: string; emoji: string; to: string; kind: "link" }
    | { id: "perfil"; label: string; icon: typeof Home; to: string; kind: "link-icon" };
  const items: Item[] = [
    { id: "home",      label: t("bottomNav.home"),       icon: Home,          kind: "button" },
    { id: "curriculo", label: t("bottomNav.curriculum"), icon: BookOpen,      kind: "button" },
    { id: "mentor",    label: t("bottomNav.mentor"),     icon: MessageCircle, kind: "button" },
    { id: "mapa",      label: t("bottomNav.map"),        emoji: "🌌", to: "/mapa-mental", kind: "link" },
    { id: "perfil",    label: t("bottomNav.profile"),    icon: User,          to: "/perfil", kind: "link-icon" },
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-2">
      <div className="glass-strong rounded-full flex items-center justify-around px-1.5 py-1.5 max-w-md mx-auto">
        {items.map((item) => {
          const isActive = active === item.id;
          const baseClass = `flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-full transition-all min-w-[54px] ${
            isActive
              ? "bg-gradient-primary text-white shadow-soft"
              : "text-slate-500 hover:text-primary"
          }`;

          if (item.kind === "link") {
            return (
              <Link
                key={item.id}
                to={item.to}
                className={baseClass}
                aria-label={item.label}
              >
                <span className="text-base leading-none" aria-hidden>{item.emoji}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          }

          if (item.kind === "link-icon") {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={baseClass}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          }

          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={baseClass}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5" strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
