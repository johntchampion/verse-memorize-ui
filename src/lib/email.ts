/** Deliberately loose: the server is the authority on what it will accept, and
    this only exists to catch a typo before a round trip. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
