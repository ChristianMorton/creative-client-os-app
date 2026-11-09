import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, users } from "@/db/schema"
import { DEV_USER_EMAIL, DEV_USER_ID, DEV_USER_NAME } from "@/lib/constants"
import { resolveStudioUserId } from "@/lib/dev-session"
import { devAuthEnabled, googleAuthConfigured } from "@/lib/env"

const googleOn = googleAuthConfigured()
const devOn = devAuthEnabled()

async function upsertGoogleUser(profile: { email: string; name?: string | null; image?: string | null }) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, profile.email) })
  if (existing) {
    await db
      .update(users)
      .set({ name: profile.name ?? existing.name, image: profile.image ?? existing.image })
      .where(eq(users.id, existing.id))
    return existing.id
  }
  const id = crypto.randomUUID()
  await db.insert(users).values({
    id,
    email: profile.email,
    name: profile.name ?? profile.email,
    image: profile.image,
  })
  return id
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    ...(googleOn
      ? [
          Google({
            authorization: {
              params: {
                scope:
                  "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
                access_type: "offline",
                prompt: "consent",
              },
            },
          }),
        ]
      : []),
    ...(devOn
      ? [
          Credentials({
            id: "dev",
            name: "Studio",
            credentials: {
              studio: { label: "Studio", type: "text" },
            },
            authorize: async () => ({
              id: DEV_USER_ID,
              email: DEV_USER_EMAIL,
              name: DEV_USER_NAME,
            }),
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        const userId = await upsertGoogleUser({
          email: user.email,
          name: user.name,
          image: user.image,
        })
        token.sub = userId
        await db
          .insert(accounts)
          .values({
            userId,
            provider: "google",
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            scope: account.scope,
          })
          .onConflictDoUpdate({
            target: [accounts.provider, accounts.providerAccountId],
            set: {
              userId,
              accessToken: account.access_token,
              refreshToken: account.refresh_token ?? undefined,
              expiresAt: account.expires_at,
              scope: account.scope,
            },
          })
      }
      const email = user?.email ?? (typeof token.email === "string" ? token.email : null)
      if (account?.provider !== "google") {
        const resolved = resolveStudioUserId({
          email,
          provider: account?.provider,
          userId: user?.id,
          tokenSub: token.sub,
        })
        if (resolved) token.sub = resolved
      }
      if (email === DEV_USER_EMAIL) {
        token.sub = DEV_USER_ID
        token.email = DEV_USER_EMAIL
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const email = session.user.email ?? (typeof token.email === "string" ? token.email : null)
        const resolved = resolveStudioUserId({
          email,
          tokenSub: token.sub,
        })
        if (resolved) session.user.id = resolved
      }
      return session
    },
  },
})
