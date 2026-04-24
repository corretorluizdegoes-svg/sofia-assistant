import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { applyDirection, SUPPORTED_LANGS } from "@/i18n";

/**
 * Sincroniza a preferência de idioma entre Supabase profiles.language e i18next.
 * - Ao logar: lê profiles.language e aplica.
 * - Ao mudar idioma: persiste em profiles.language.
 */
export function useLanguagePreference() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  // Carrega preferência ao logar
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const lang = data?.language;
      if (lang && SUPPORTED_LANGS.find((l) => l.code === lang) && lang !== i18n.language) {
        await i18n.changeLanguage(lang);
        applyDirection(lang);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function changeLanguage(code: string) {
    await i18n.changeLanguage(code);
    applyDirection(code);
    if (user) {
      await supabase
        .from("profiles")
        .update({ language: code })
        .eq("user_id", user.id);
    }
  }

  return { current: i18n.language, changeLanguage };
}
