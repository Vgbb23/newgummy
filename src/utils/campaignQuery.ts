/**
 * Persistência da query string completa (UTMs, fbclid, gclid, etc.) para acompanhar a URL em todas as páginas.
 */

const FULL_QUERY_KEY = 'full_campaign_query';

/** Grava a query atual se tiver ao menos um parâmetro. */
export function persistFullQuery(search: string): void {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw.trim()) return;
  try {
    sessionStorage.setItem(FULL_QUERY_KEY, raw);
  } catch {
    /* ignore */
  }
}

function getStoredQueryRaw(): string {
  try {
    return sessionStorage.getItem(FULL_QUERY_KEY) || '';
  } catch {
    return '';
  }
}

/** Mescla parâmetros gravados na sessão com a query atual (não sobrescreve chaves já presentes). */
export function mergeStoredQueryParams(currentSearch: string): string {
  const raw = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch;
  const cur = new URLSearchParams(raw);
  const stored = getStoredQueryRaw();
  if (!stored) return cur.toString();
  const st = new URLSearchParams(stored);
  st.forEach((v, k) => {
    if (!cur.has(k)) cur.set(k, v);
  });
  return cur.toString();
}
