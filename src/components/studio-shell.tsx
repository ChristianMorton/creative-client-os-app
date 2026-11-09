import Link from "next/link"
import { LogOut } from "lucide-react"
import { signOutStudio } from "@/lib/actions"
import { STUDIO_NAME } from "@/lib/constants"
import { StudioNav } from "@/components/studio-nav"

export function StudioShell({
  user,
  children,
}: {
  user: { name: string }
  children: React.ReactNode
}) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-row items-center gap-4 border-b border-sidebar-border bg-sidebar px-5 py-3 md:w-64 md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r md:p-8">
        <div className="md:mb-12">
          <Link
            href="/today"
            className="block text-left font-serif text-xl italic tracking-tight transition hover:opacity-70 md:text-2xl"
          >
            {STUDIO_NAME}
          </Link>
        </div>
        <StudioNav />
        <div className="flex items-center gap-3 md:mt-auto md:border-t md:border-sidebar-border md:pt-5">
          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-accent font-mono text-xs text-muted-foreground md:flex">
            {initials}
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <div className="truncate text-sm">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{STUDIO_NAME}</div>
          </div>
          <form action={signOutStudio}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
