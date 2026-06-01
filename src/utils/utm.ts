/**
 * UTM alinhado ao Verisol / testohard: sessionStorage utmify:* + envio `utm` na criação do PIX (Fruitfy).
 */

import { mergeStoredQueryParams } from './campaignQuery';

const UTM_STORAGE_KEY = 'utm_params';

export const UTM_PREFIXES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

function getSearchParams(search: string): URLSearchParams {
  const q = search.startsWith('?') ? search : `?${search}`;
  return new URLSearchParams(q);
}

export function hasUtmParams(search: string): boolean {
  if (!search || !search.startsWith('?')) return false;
  const params = getSearchParams(search);
  return UTM_PREFIXES.some((key) => params.has(key));
}

/**
 * Coleta UTMs da query atual mesclada com a campanha salva na sessão.
 * Usado no checkout para enviar ao backend junto com a criação do PIX.
 */
export function collectUtmParamsFromSearch(currentSearch: string): Record<
  (typeof UTM_PREFIXES)[number],
  string
> {
  const merged = mergeStoredQueryParams(currentSearch || '');
  const searchParams = new URLSearchParams(merged);
  const utm = {} as Record<(typeof UTM_PREFIXES)[number], string>;

  for (const key of UTM_PREFIXES) {
    const valueFromUrl = searchParams.get(key)?.trim() ?? '';
    const storageKey = `utmify:${key}`;
    let valueFromStorage = '';
    try {
      valueFromStorage = sessionStorage.getItem(storageKey)?.trim() ?? '';
      if (valueFromUrl) sessionStorage.setItem(storageKey, valueFromUrl);
    } catch {
      /* ignore */
    }
    utm[key] = valueFromUrl || valueFromStorage || '';
  }

  return utm;
}

export function getUtmSearch(currentSearch: string): string {
  const s = typeof currentSearch === 'string' ? currentSearch : '';
  if (hasUtmParams(s)) return s.startsWith('?') ? s : `?${s}`;
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? (stored.startsWith('?') ? stored : `?${stored}`) : '';
  } catch {
    return '';
  }
}

export function persistUtmSearch(search: string): void {
  if (!search || !hasUtmParams(search)) return;
  try {
    const q = search.startsWith('?') ? search : `?${search}`;
    sessionStorage.setItem(UTM_STORAGE_KEY, q);
  } catch {
    /* ignore */
  }
}
