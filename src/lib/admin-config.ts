/**
 * Configuração de identidade do administrador único.
 *
 * Esta constante é usada para liberar o "Modo Comandante" — uma camada
 * de consultoria técnica conversacional disponível apenas para o criador
 * do projeto. Tanto o frontend quanto a edge function `sofia-dev-chat`
 * comparam o email do JWT com este valor.
 */
export const ADMIN_EMAIL = "sustainingpulse@gmail.com";

/** Normaliza um email do JWT pra comparação case-insensitive e sem espaços. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").toLowerCase().trim();
}

/** True se o email pertence ao Comandante. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}
