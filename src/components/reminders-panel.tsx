"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addReminderAction, setReminderDoneAction } from "@/lib/actions"
import { formatDay } from "@/lib/format"
import { todayKey } from "@/lib/pipeline"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export function RemindersPanel({
  jobId,
  reminders,
}: {
  jobId: string
  reminders: { id: string; body: string; dueOn: string; done: boolean }[]
}) {
  const [body, setBody] = useState("")
  const [dueOn, setDueOn] = useState("")
  const [pending, start] = useTransition()
  const today = todayKey()

  function add() {
    start(async () => {
      const result = await addReminderAction(jobId, body, dueOn)
      if (!result.ok) toast.error(result.error)
      else {
        setBody("")
        setDueOn("")
      }
    })
  }

  return (
    <Section title="Reminders">
      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders. Add one for invoices, call-backs or backups.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {reminders.map((reminder) => {
            const overdue = !reminder.done && reminder.dueOn < today
            return (
              <li key={reminder.id} className="flex items-start gap-3 py-2.5">
                <Checkbox
                  className="mt-0.5"
                  checked={reminder.done}
                  onCheckedChange={(checked) => {
                    start(async () => {
                      const result = await setReminderDoneAction(jobId, reminder.id, checked === true)
                      if (!result.ok) toast.error(result.error)
                    })
                  }}
                />
                <div className="min-w-0">
                  <p className={reminder.done ? "text-sm text-muted-foreground line-through" : "text-sm"}>
                    {reminder.body}
                  </p>
                  <p className={overdue ? "text-[13px] text-foreground" : "text-[13px] text-muted-foreground"}>
                    {formatDay(reminder.dueOn)}
                    {overdue ? " · overdue" : ""}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <Input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Follow up"
        />
        <Input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
        <Button variant="secondary" size="sm" disabled={pending || !body.trim() || !dueOn} onClick={add}>
          Add
        </Button>
      </div>
    </Section>
  )
}
