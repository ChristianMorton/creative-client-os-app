"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { NewJobDialog } from "@/components/new-job-dialog"
import { StatusAction } from "@/components/status-action"
import { formatDay } from "@/lib/format"
import { craftShort, HAPPY_PATH, statusLabel, type JobStatus } from "@/lib/pipeline"
import type { JobListItem } from "@/lib/queries"

export function PipelineBoard({ jobs }: { jobs: JobListItem[] }) {
  const [showLost, setShowLost] = useState(false)
  const lost = jobs.filter((job) => job.status === "lost")

  return (
    <div className="px-6 py-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl italic tracking-tight md:text-5xl">On the desk</h1>
        <div className="md:hidden">
          <NewJobDialog />
        </div>
      </header>

      <div className="mt-10 flex gap-8 overflow-x-auto pb-6">
        {HAPPY_PATH.map((status) => {
          const cards = jobs
            .filter((job) => job.status === status)
            .sort((a, b) => (a.shootDate ?? "9999").localeCompare(b.shootDate ?? "9999"))
          return (
            <div key={status} className="w-64 shrink-0">
              <div className="mb-5 flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="font-serif text-lg italic">{statusLabel(status)}</h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(cards.length).padStart(2, "0")}
                </span>
              </div>
              <div className="space-y-4">
                {cards.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs italic text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  cards.map((job) => <JobCard key={job.id} job={job} />)
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowLost((value) => !value)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`h-4 w-4 transition ${showLost ? "" : "-rotate-90"}`} /> Lost ({lost.length})
      </button>
      {showLost ? (
        <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
          {lost.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function JobCard({ job }: { job: JobListItem }) {
  return (
    <div className="group animate-rise rounded-sm border border-border bg-card p-5 transition-shadow hover:paper-shadow">
      <Link href={`/jobs/${job.id}`} className="block">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{craftShort(job.craft)}</span>
          <span>{job.shootDate ? formatDay(job.shootDate) : "—"}</span>
        </div>
        <div className="mt-2 min-w-0">
          <div className="font-serif text-xl leading-tight">{job.clientName}</div>
          <div className="truncate text-xs text-muted-foreground">{job.title}</div>
        </div>
      </Link>
      {job.status !== "lost" ? (
        <StatusAction job={{ id: job.id, status: job.status as JobStatus, clientName: job.clientName }} presentation="card" />
      ) : null}
    </div>
  )
}
