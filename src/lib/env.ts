export function googleAuthConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
}

export function devAuthEnabled() {
  // A missing OAuth configuration must never expose passwordless sign-in in production.
  if (process.env.NODE_ENV === "production") return false
  if (!googleAuthConfigured()) return true
  return process.env.AUTH_DEV_MODE === "true"
}
