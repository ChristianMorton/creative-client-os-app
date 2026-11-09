"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { KanbanSquare, List, Sun } from "lucide-react"
import { cn } from "cn"

const items = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/jobs", label: "Jobs", icon: List },
]

export function StudioNav() {
  const path = usePathname()
  return (
    <nav className="flex flex-1 gap-5 md:flex-col md:gap-3">
      <p className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground md:block">
        Workspace
      </p>
      {items.map((item) => {
        const active =
          item.href === "/jobs"
            ? path.startsWith("/jobs")
            : item.href === "/pipeline"
              ? path.startsWith("/pipeline")
              : path === "/today" || path.startsWith("/today")
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-fit items-center gap-2.5 border-b border-transparent pb-0.5 text-sm text-muted-foreground transition hover:text-foreground",
              active && "border-foreground text-foreground",
            )}
          >
            <Icon className="h-4 w-4 md:hidden" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
