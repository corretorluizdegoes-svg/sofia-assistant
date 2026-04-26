import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_EMAIL, isAdminEmail } from "@/lib/admin-config";

// Re-export pra retrocompat com imports antigos
export { ADMIN_EMAIL };

/**
 * Hook compartilhado de identidade de admin.
 *
 * Usado pelo Modo Comandante (`useDevMode`) e pelo legado `editor-mode`
 * (em remoção). Centraliza a checagem do email único do administrador.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdminEmail(user?.email);
}
