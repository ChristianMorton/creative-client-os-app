import { cn } from "cn"
import { statusDot, statusLabel, type JobStatus } from "@/lib/pipeline"

export function StatusMark({ status }: { status: JobStatus }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(status))} />
      <span>{statusLabel(status)}</span>
    </span>
  )
}
