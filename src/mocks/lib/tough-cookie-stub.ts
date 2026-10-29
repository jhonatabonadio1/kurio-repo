/**
 * Build-time replacement for `tough-cookie` (vite.config.ts alias).
 *
 * MSW imports tough-cookie (and, through it, the tldts public-suffix list,
 * ~260 KB of the mock bundle) only for its mock cookie store. This API never
 * uses cookies: the session travels in the Authorization header and the guest
 * cart in X-Cart-Token. The stub keeps MSW's calls working and stores nothing,
 * so `request.cookies` in a handler would only see document.cookie.
 */
export class Cookie {
  static fromJSON(): null {
    return null
  }
  toJSON(): Record<string, never> {
    return {}
  }
}

export class MemoryCookieStore {
  idx: Record<string, Record<string, Record<string, Cookie>>> = {}
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}
  getCookiesSync(_url: string): Cookie[] {
    return []
  }
  async setCookie(_cookie: string, _url: string): Promise<void> {}
}
