import { useCallback, useEffect, useState } from "react";
import { useIsAdmin } from "@/components/editor-mode/useIsAdmin";

/**
 * Modo Editor + Modo Comandante.
 *
 * - **Modo Editor**: ATIVO automaticamente sempre que o admin (sustainingpulse@gmail.com)
 *   está logado. Permite à Sofia inspecionar e (após confirmação) editar mind_map_nodes
 *   e mind_map_edges via edge function `sofia-dev-chat` com tier="editor".
 *
 * - **Modo Comandante**: ELEVAÇÃO opcional sobre o Editor, ativada pela frase mágica
 *   "O Comando está no Centro." dentro do chat da Sofia. Adiciona análise estratégica
 *   e convocação de núcleos operacionais. Persistido em sessionStorage — some no logout.
 *
 * Para checagens granulares no UI:
 *   - `editorAtivo`  → admin logado (qualquer hora)
 *   - `comandanteAtivo` → admin logado + ritual feito
 */
const STORAGE_KEY = "sofia.comandanteAtivo";

export function useDevMode() {
  const isAdmin = useIsAdmin();
  const [comandante, setComandante] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  });

  // Logout / não-admin → derruba o Comandante imediatamente.
  useEffect(() => {
    if (!isAdmin && comandante) {
      sessionStorage.removeItem(STORAGE_KEY);
      setComandante(false);
    }
  }, [isAdmin, comandante]);

  const activate = useCallback(() => {
    if (!isAdmin) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    setComandante(true);
  }, [isAdmin]);

  const deactivate = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setComandante(false);
  }, []);

  const editorAtivo = isAdmin;                 // sempre que admin logado
  const comandanteAtivo = isAdmin && comandante;

  return {
    // novos campos:
    editorAtivo,
    comandanteAtivo,
    tier: comandanteAtivo ? ("comandante" as const) : ("editor" as const),
    // compat com código existente (active = comandante ativo):
    active: comandanteAtivo,
    isAdmin,
    activate,
    deactivate,
  };
}
