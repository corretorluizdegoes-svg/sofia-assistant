import { useAuth } from "@/contexts/AuthContext";

export const ADMIN_EMAIL = "corretor.luizdegoes@gmail.com";

/**
 * Hook isolado do Modo Editor. Retorna true apenas se o usuário
 * autenticado for o administrador único do projeto.
 *
 * Para remover a feature: delete a pasta `editor-mode` inteira
 * e remova o <EditorMode /> do App.tsx.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase().trim();
  return email === ADMIN_EMAIL;
}
