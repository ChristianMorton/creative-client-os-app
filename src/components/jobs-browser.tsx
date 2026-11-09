"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { NewJobDialog } from "@/components/new-job-dialog"
import { StatusMark } from "@/components/status-mark"
import { formatDay } from "@/lib/format"
import { CRAFTS, craftLabel, JOB_STATUSES, statusLabel, type Craft, type JobStatus } from "@/lib/pipeline"
import type { JobListItem } from "@/lib/queries"

export function JobsBrowser({
  jobs,
  initialStatus = "all",
}: {
  jobs: JobListItem[]
  initialStatus?: JobStatus | "all"
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<JobStatus | "all">(initialStatus)
  const [craft, setCraft] = useState<Craft | "all">("all")
  const sel = "rounded-sm border border-input bg-card px-3 py-2 text-sm outline-none focus:border-foreground"

  const rows = useMemo(
    () =>
      jobs.filter(
        (job) =>
          (status === "all" || job.status === status) &&
          (craft === "all" || job.craft === craft) &&
          `${job.clientName} ${job.title}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [jobs, status, craft, query],
  )

  return (
    <div className="safelight min-h-full px-6 py-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl italic tracking-tight md:text-5xl">All jobs</h1>
        <NewJobDialog />
      </header>
      <div className="mt-8 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search client or title"
            className={`${sel} w-full pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as JobStatus | "all")}
          className={sel}
        >
          <option value="all">All statuses</option>
          {JOB_STATUSES.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </select>
        <select
          value={craft}
          onChange={(event) => setCraft(event.target.value as Craft | "all")}
          className={sel}
        >
          <option value="all">All crafts</option>
          {CRAFTS.map((item) => (
            <option key={item} value={item}>
              {craftLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-6 overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Job</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Craft</th>
              <th className="px-5 py-3 text-right font-medium">Shoot</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-background"
              >
                <td className="px-5 py-4 font-serif text-lg">{job.clientName}</td>
                <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">{job.title}</td>
                <td className="px-5 py-4">
                  <StatusMark status={job.status} />
                </td>
                <td className="hidden px-5 py-4 text-muted-foreground sm:table-cell">{craftLabel(job.craft)}</td>
                <td className="px-5 py-4 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {job.shootDate ? formatDay(job.shootDate) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground italic">
                  No jobs match those filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
