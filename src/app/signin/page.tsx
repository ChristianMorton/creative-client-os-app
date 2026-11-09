import { redirect } from "next/navigation"
import { Aperture } from "lucide-react"
import { auth } from "@/auth"
import { signInDev, signInGoogle } from "@/lib/actions"
import { devAuthEnabled, googleAuthConfigured } from "@/lib/env"

export const dynamic = "force-dynamic"

export const metadata = { title: "Sign in" }

export default async function SignInPage() {
  const session = await auth()
  if (session?.user?.id) redirect("/today")
  const google = googleAuthConfigured()
  const dev = devAuthEnabled()

  return (
    <main className="safelight flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-10 flex items-center gap-2 text-muted-foreground">
          <Aperture className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em]">Creative Client OS</span>
        </div>
        <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">
          Every job, <em>lead to paid.</em>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          A quiet desk for photographers, cinematographers and editors.
        </p>
        <div className="mt-10 space-y-3">
          {google ? (
            <form action={signInGoogle}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90"
              >
                Continue with Google
              </button>
            </form>
          ) : null}
          {dev ? (
            <form action={signInDev}>
              <button
                type="submit"
                className={
                  google
                    ? "flex w-full items-center justify-center gap-2 rounded-sm border border-input px-4 py-3 text-sm transition hover:border-foreground"
                    : "flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90"
                }
              >
                Continue as studio (demo)
              </button>
            </form>
          ) : null}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          {dev
            ? "The demo opens Field Studio with a few sample jobs to click through."
            : "Google opens your own studio."}
        </p>
      </div>
    </main>
  )
}
