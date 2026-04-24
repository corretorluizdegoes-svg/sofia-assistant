import { useTranslation } from "react-i18next";
import { Check, Languages } from "lucide-react";
import { SUPPORTED_LANGS } from "@/i18n";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Props = {
  variant?: "light" | "dark";
};

export function LanguageSwitcher({ variant = "light" }: Props) {
  const { t, i18n } = useTranslation();
  const { changeLanguage } = useLanguagePreference();
  const current = SUPPORTED_LANGS.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGS[0];

  const triggerClass =
    variant === "dark"
      ? "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-white border border-white/15"
      : "inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 text-xs text-foreground hover:shadow-soft transition-all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label={t("lang.title")}>
        <span className="text-base leading-none" aria-hidden>{current.flag}</span>
        <span className="font-medium hidden sm:inline">{current.code.toUpperCase()}</span>
        <Languages className="w-3.5 h-3.5 opacity-60 hidden sm:inline" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="text-xs">{t("lang.current")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGS.map((l) => {
          const active = l.code === current.code;
          return (
            <DropdownMenuItem
              key={l.code}
              onClick={() => changeLanguage(l.code)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span className="text-lg leading-none" aria-hidden>{l.flag}</span>
              <span className="flex-1 text-sm">{l.native}</span>
              {active && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
