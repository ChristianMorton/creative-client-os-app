import { DEV_USER_EMAIL, DEV_USER_ID } from "@/lib/constants"

/** Dev studio sign-in always owns the seeded Avery Chen rows. */
export function resolveStudioUserId(input: {
  email?: string | null
  provider?: string | null
  userId?: string | null
  tokenSub?: string | null
}) {
  const devSignIn =
    input.email === DEV_USER_EMAIL ||
    input.provider === "dev" ||
    input.provider === "credentials"
  if (devSignIn) return DEV_USER_ID
  return input.userId || input.tokenSub || undefined
}
