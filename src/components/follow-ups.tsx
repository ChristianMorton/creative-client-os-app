import Link from "next/link"
import { NewJobDialog } from "@/components/new-job-dialog"
import { formatDay } from "@/lib/format"
import { statusDot, todayKey, type JobStatus } from "@/lib/pipeline"

export function FollowUps({
  items,
}: {
  items: {
    id: string
    jobId: string
    clientName: string
    status: JobStatus
    dueOn: string
  }[]
}) {
  const today = todayKey()
  return (
    <div className="flex h-14 items-center gap-6 border-b border-border bg-card px-6 md:px-10">
      <span className="shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Attention required
      </span>
      {items.length === 0 ? (
        <span className="text-xs text-muted-foreground">Nothing to chase. Enjoy the quiet.</span>
      ) : (
        <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/jobs/${item.jobId}`}
              className="flex items-center gap-2 whitespace-nowrap text-xs transition hover:text-foreground"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot(item.status)}`} />
              <span>{item.clientName}</span>
              <span
                className={`font-mono text-[10px] ${item.dueOn <= today ? "text-foreground underline underline-offset-4" : "text-muted-foreground"}`}
              >
                {item.dueOn <= today ? "today" : formatDay(item.dueOn)}
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="ml-auto hidden shrink-0 md:block">
        <NewJobDialog />
      </div>
    </div>
  )
}
