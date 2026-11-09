"use client"

import { useState, useTransition } from "react"
import { ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"
import { transitionJobAction } from "@/lib/actions"
import { canMarkLost, nextStatus, statusLabel, type JobStatus } from "@/lib/pipeline"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function StatusAction({
  job,
  presentation = "banner",
  label,
}: {
  job: { id: string; status: JobStatus; clientName: string }
  presentation?: "banner" | "card" | "pill"
  label?: string
}) {
  const next = nextStatus(job.status)
  const [pending, start] = useTransition()
  const [bookOpen, setBookOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [reason, setReason] = useState("")
  const text = label ?? (next ? `Move to ${statusLabel(next)}` : null)

  function move(to: JobStatus, lostReason?: string) {
    start(async () => {
      const result = await transitionJobAction(job.id, to, lostReason)
      if (!result.ok) toast.error(result.error)
      else {
        setBookOpen(false)
        setLostOpen(false)
      }
    })
  }

  function advance() {
    if (!next) return
    if (job.status === "quoted") setBookOpen(true)
    else move(next)
  }

  const dialogs = (
    <>
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Book {job.clientName}</DialogTitle>
            <DialogDescription>
              Booking creates /{job.clientName} folders for admin, raw, exports, and client delivery,
              and puts the shoot and delivery on the calendar. Google is used when this studio is
              connected. Otherwise the links are recorded locally.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>
              Not yet
            </Button>
            <Button disabled={pending} onClick={() => move("booked")}>
              {pending ? "Booking…" : "Book and create folders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Mark as lost</DialogTitle>
            <DialogDescription>Lost is final in this version. A short reason helps later.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What happened? (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => move("lost", reason)}>
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (presentation === "card") {
    if (!text) return null
    return (
      <>
        <button
          type="button"
          onClick={advance}
          disabled={pending}
          className="mt-4 flex w-full items-center justify-between border-t border-border pt-3 text-[11px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : text}
          <ArrowRight className="h-3 w-3" />
        </button>
        {dialogs}
      </>
    )
  }

  if (presentation === "pill") {
    if (!text) return null
    return (
      <>
        <button
          type="button"
          onClick={advance}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground disabled:opacity-60"
        >
          <Check className="h-3 w-3" /> {pending ? "Saving…" : text}
        </button>
        {dialogs}
      </>
    )
  }

  if (!text && !canMarkLost(job.status)) return null

  return (
    <>
      {text ? (
        <button
          type="button"
          onClick={advance}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : text} <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
      {canMarkLost(job.status) ? (
        <button
          type="button"
          onClick={() => setLostOpen(true)}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Mark lost
        </button>
      ) : null}
      {dialogs}
    </>
  )
}
