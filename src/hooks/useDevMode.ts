import { useCallback, useEffect, useState } from "react";
import { useIsAdmin } from "@/components/editor-mode/useIsAdmin";

/**
 * Modo Comandante (dev mode da Sofia).
 *
 * - Persistido em `sessionStorage` (não localStorage): some no logout.
 * - Só pode ativar se o usuário for admin (checagem dupla com a edge function).
 * - Frases mágicas de ativação/desativação ficam no `ChatSofia.tsx`.
 */
const STORAGE_KEY = "sofia.devMode";

export function useDevMode() {
  const isAdmin = useIsAdmin();
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  });

  // Se o usuário deslogar / não for admin, força desativar.
  useEffect(() => {
    if (!isAdmin && active) {
      sessionStorage.removeItem(STORAGE_KEY);
      setActive(false);
    }
  }, [isAdmin, active]);

  const activate = useCallback(() => {
    if (!isAdmin) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    setActive(true);
  }, [isAdmin]);

  const deactivate = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setActive(false);
  }, []);

  return { active: active && isAdmin, isAdmin, activate, deactivate };
}
