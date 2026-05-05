// Geração 100% local do título de uma conversa a partir da primeira
// mensagem do usuário. Sem chamada à API da Sofia.

const STOP_WORDS_CURTAS = new Set([
  "a","o","e","é","de","da","do","na","no","um","uma","as","os",
  "em","ao","à","às","aos","ou","se","me","te","lhe","já","só",
  "the","a","an","of","to","in","on","is","it","at",
]);

const TITULO_MAX = 40;

export function gerarTituloDeMensagem(textoBruto: string): string {
  if (!textoBruto) return "";

  // Remove pontuação excessiva (mantém letras, números, espaços e hífens dentro de palavras).
  const limpo = textoBruto
    .replace(/[`*_~"'(){}\[\]<>]/g, " ")
    .replace(/[!?.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!limpo) return "";

  // Filtra palavras-stop com menos de 3 letras (artigos/preposições curtas),
  // mas mantém a primeira palavra mesmo que curta — pra não começar do meio.
  const palavras = limpo.split(" ");
  const filtradas = palavras.filter((p, i) => {
    if (i === 0) return true;
    if (p.length >= 3) return true;
    return !STOP_WORDS_CURTAS.has(p.toLowerCase());
  });

  const reconstruido = filtradas.join(" ").trim();
  if (!reconstruido) return "";

  // Capitaliza apenas a primeira letra da primeira palavra; o resto preserva o caso original.
  const primeiraCap =
    reconstruido.charAt(0).toLocaleUpperCase("pt-BR") + reconstruido.slice(1);

  // Trunca em até TITULO_MAX caracteres, sempre cortando na última palavra completa.
  if (primeiraCap.length <= TITULO_MAX) return primeiraCap;
  const cortado = primeiraCap.slice(0, TITULO_MAX);
  const ultEspaco = cortado.lastIndexOf(" ");
  return (ultEspaco > 0 ? cortado.slice(0, ultEspaco) : cortado).trim();
}

export const TITULO_CONVERSA_MAX = TITULO_MAX;
