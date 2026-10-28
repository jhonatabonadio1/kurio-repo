/**
 * Random id of this browser's guest cart, sent as X-Cart-Token. It is
 * replaced after login (the guest cart was merged) and after logout (the
 * next visitor must not see the previous cart).
 */
const STORAGE_KEY = 'kurio-cart-token'
let memory: string | null = null

export function getCartToken(): string {
  try {
    let token = localStorage.getItem(STORAGE_KEY)
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, token)
    }
    return token
  } catch {
    return (memory ??= crypto.randomUUID())
  }
}

export function rotateCartToken() {
  memory = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return getCartToken()
}
