/**
 * Mock password hashing: salted SHA-256 via Web Crypto (browser and Node).
 * Enough for a simulation where nothing leaves the browser; a real backend
 * would use a slow hash (argon2/bcrypt). Plain passwords are never stored.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const randomId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

export const randomToken = () => `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
