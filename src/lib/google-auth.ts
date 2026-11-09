import { and, eq } from "drizzle-orm"
import { google } from "googleapis"
import { db } from "@/db"
import { accounts } from "@/db/schema"

export async function googleAuthFor(userId: string) {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) return null

  const row = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.provider, "google")),
  })
  if (!row?.accessToken && !row?.refreshToken) return null

  const oauth = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  )
  oauth.setCredentials({
    access_token: row.accessToken ?? undefined,
    refresh_token: row.refreshToken ?? undefined,
    expiry_date: row.expiresAt ? row.expiresAt * 1000 : undefined,
  })
  oauth.on("tokens", (tokens) => {
    void db
      .update(accounts)
      .set({
        accessToken: tokens.access_token ?? row.accessToken,
        refreshToken: tokens.refresh_token ?? row.refreshToken,
        expiresAt: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : row.expiresAt,
      })
      .where(eq(accounts.id, row.id))
  })
  return oauth
}
