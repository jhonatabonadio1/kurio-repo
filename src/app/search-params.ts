/**
 * Plain, readable query strings for TanStack Router:
 *   ?q=golden&categories=musica,jogos&page=2
 * instead of the default JSON encoding. Every value is parsed back as a
 * string; each route's zod schema coerces it (numbers, comma lists).
 */
export function parseSearch(searchStr: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(searchStr))
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }
  const query = params.toString().replace(/%2C/g, ',')
  return query ? `?${query}` : ''
}
