import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";
import ru from "./locales/ru.json";
import ar from "./locales/ar.json";

export type LangCode =
  | "pt" | "en" | "es" | "fr" | "de" | "it" | "ja" | "zh" | "ru" | "ar";

export const SUPPORTED_LANGS: { code: LangCode; flag: string; label: string; native: string; rtl?: boolean }[] = [
  { code: "pt", flag: "🇧🇷", label: "Portuguese",          native: "Português" },
  { code: "en", flag: "🇺🇸", label: "English",             native: "English" },
  { code: "es", flag: "🇪🇸", label: "Spanish",             native: "Español" },
  { code: "fr", flag: "🇫🇷", label: "French",              native: "Français" },
  { code: "de", flag: "🇩🇪", label: "German",              native: "Deutsch" },
  { code: "it", flag: "🇮🇹", label: "Italian",             native: "Italiano" },
  { code: "ja", flag: "🇯🇵", label: "Japanese",            native: "日本語" },
  { code: "zh", flag: "🇨🇳", label: "Chinese (Simplified)", native: "简体中文" },
  { code: "ru", flag: "🇷🇺", label: "Russian",             native: "Русский" },
  { code: "ar", flag: "🇸🇦", label: "Arabic",              native: "العربية", rtl: true },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      ja: { translation: ja },
      zh: { translation: zh },
      ru: { translation: ru },
      ar: { translation: ar },
    },
    fallbackLng: "pt",
    supportedLngs: SUPPORTED_LANGS.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "sofia.lang",
      caches: ["localStorage"],
    },
  });

export function applyDirection(lng: string) {
  const isRtl = SUPPORTED_LANGS.find((l) => l.code === lng)?.rtl;
  document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lng);
}

i18n.on("languageChanged", applyDirection);
applyDirection(i18n.language || "pt");

export default i18n;

export function languageName(code: string): string {
  const native: Record<string, string> = {
    pt: "Portuguese (Brazil)",
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    ja: "Japanese",
    zh: "Simplified Chinese",
    ru: "Russian",
    ar: "Arabic",
  };
  return native[code] ?? "Portuguese (Brazil)";
}
