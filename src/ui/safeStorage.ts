/**
 * Safari throws a SecurityError on merely *touching* window.localStorage when
 * "Block All Cookies" is on, so every access has to be wrapped — not just writes.
 */
export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode or cookies blocked: this is a convenience, never load-bearing */
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* see readLocal */
  }
}
