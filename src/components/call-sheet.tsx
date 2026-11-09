"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"
import { setReminderDoneAction } from "@/lib/actions"
import { NewJobDialog } from "@/components/new-job-dialog"
import { StatusAction } from "@/components/status-action"
import { formatDay } from "@/lib/format"
import { LANES, type CallTask, type Lane } from "@/lib/call-sheet"
import { craftShort } from "@/lib/pipeline"

export function CallSheet({ tasks, today }: { tasks: CallTask[]; today: string }) {
  const [lane, setLane] = useState<Lane | "all">("all")
  const visible = lane === "all" ? tasks : tasks.filter((task) => task.lane === lane)
  const focus = tasks.find((task) => task.urgent) ?? tasks[0]
  const hour = new Date().getHours()
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="min-h-full">
      <header className="border-b border-border px-6 pt-10 pb-8 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{dateLine}</p>
            <h1 className="mt-3 font-serif text-4xl italic tracking-tight md:text-5xl">{greet}.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tasks.length === 0
                ? "Nothing pressing. A clear day."
                : `${tasks.length} ${tasks.length === 1 ? "thing" : "things"} on today's call sheet.`}
            </p>
          </div>
          <NewJobDialog />
        </div>

        {focus ? (
          <Link
            href={`/jobs/${focus.jobId}`}
            className="group mt-8 flex items-center justify-between gap-6 rounded-sm bg-accent/60 px-6 py-5 transition hover:bg-accent"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Start here</p>
              <p className="mt-1.5 font-serif text-2xl italic">{focus.taskTitle}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {focus.clientName} · {focus.jobTitle} — {focus.detail}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        ) : null}
      </header>

      <div className="flex gap-6 overflow-x-auto border-b border-border px-6 md:px-12">
        {[{ id: "all" as const, label: "Everything" }, ...LANES].map((item) => {
          const count = item.id === "all" ? tasks.length : tasks.filter((task) => task.lane === item.id).length
          const on = lane === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLane(item.id)}
              className={`shrink-0 border-b py-4 text-sm transition ${on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {item.label} <span className="ml-1 font-mono text-xs text-muted-foreground">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-12 px-6 py-10 md:px-12">
        {LANES.filter((item) => lane === "all" || lane === item.id).map((item) => {
          const rows = visible.filter((task) => task.lane === item.id)
          return (
            <section key={item.id}>
              <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-2">
                <h2 className="font-serif text-xl italic">{item.label}</h2>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              </div>
              {rows.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Nothing here this week.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((task) => (
                    <li key={task.key} className="group flex items-center gap-4 py-4">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${task.urgent ? "bg-foreground" : "bg-border"}`} />
                      <Link href={`/jobs/${task.jobId}`} className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="text-sm font-medium">{task.taskTitle}</span>
                          <span className="font-serif text-base italic text-muted-foreground">{task.clientName}</span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {task.jobTitle} · {craftShort(task.craft)} · {task.detail}
                        </div>
                      </Link>
                      <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:block">
                        {task.when === today ? "Today" : formatDay(task.when)}
                      </span>
                      {task.reminderId ? (
                        <ReminderDone jobId={task.jobId} reminderId={task.reminderId} />
                      ) : task.advance ? (
                        <StatusAction
                          job={{ id: task.jobId, status: task.status, clientName: task.clientName }}
                          presentation="pill"
                          label={task.advance}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ReminderDone({ jobId, reminderId }: { jobId: string; reminderId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const result = await setReminderDoneAction(jobId, reminderId, true)
          if (!result.ok) toast.error(result.error)
          else toast.success("Done. One less thing.")
        })
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground disabled:opacity-60"
    >
      <Check className="h-3 w-3" /> {pending ? "Saving…" : "Done"}
    </button>
  )
}
