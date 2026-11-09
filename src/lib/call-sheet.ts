import type { CallSheetJob } from "@/lib/queries"
import { craftShort, type Craft, type JobStatus } from "@/lib/pipeline"

export type Lane = "shoot" | "edit" | "desk"

export type CallTask = {
  key: string
  lane: Lane
  jobId: string
  clientName: string
  jobTitle: string
  craft: Craft
  status: JobStatus
  taskTitle: string
  detail: string
  when: string
  urgent: boolean
  advance?: string
  reminderId?: string
}

export const LANES: { id: Lane; label: string; hint: string }[] = [
  { id: "shoot", label: "On set", hint: "Shoots & prep" },
  { id: "edit", label: "In the bay", hint: "Edits on the cutting table" },
  { id: "desk", label: "At the desk", hint: "Clients, quotes, invoices" },
]

function shift(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysUntil(date: string, today: string) {
  const [year, month, day] = date.split("-").map(Number)
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number)
  const target = Date.UTC(year, month - 1, day)
  const start = Date.UTC(todayYear, todayMonth - 1, todayDay)
  return Math.round((target - start) / 864e5)
}

export function relDay(date: string, today: string) {
  const n = daysUntil(date, today)
  if (n < -1) return `${-n} days overdue`
  if (n === -1) return "Yesterday"
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  return `In ${n} days`
}

export function buildCallSheet(jobs: CallSheetJob[], today: string): CallTask[] {
  const soon = shift(today, 2)
  const week = shift(today, 7)
  const tasks: CallTask[] = []

  for (const job of jobs) {
    if (job.status === "lost" || job.status === "paid") continue
    const usedReminders = new Set<string>()

    if (
      job.shootDate &&
      (job.status === "booked" || job.status === "quoted") &&
      job.shootDate >= today &&
      job.shootDate <= week
    ) {
      const left = job.packing.filter((item) => !item.checked).length
      const isToday = job.shootDate === today
      tasks.push({
        key: `shoot-${job.id}`,
        lane: "shoot",
        jobId: job.id,
        clientName: job.clientName,
        jobTitle: job.title,
        craft: job.craft,
        status: job.status,
        taskTitle: isToday ? "Shoot day" : job.craft === "editor" ? "Prep for the session" : "Prep & pack kit",
        detail:
          job.packing.length === 0
            ? "No kit list yet — add one from a template"
            : left === 0
              ? "Kit packed"
              : `${left} of ${job.packing.length} items still to pack`,
        when: job.shootDate,
        urgent: daysUntil(job.shootDate, today) <= 1,
        advance: isToday && job.status === "booked" ? "Wrap shoot · start edit" : undefined,
      })
    }

    if (job.status === "in_progress") {
      const due = job.deliveryDue ?? shift(today, 30)
      const n = daysUntil(due, today)
      tasks.push({
        key: `edit-${job.id}`,
        lane: "edit",
        jobId: job.id,
        clientName: job.clientName,
        jobTitle: job.title,
        craft: job.craft,
        status: job.status,
        taskTitle: n <= 2 ? "Finish & export" : n <= 6 ? "Refine the cut" : "Cut an assembly",
        detail: job.deliveryDue
          ? `Delivery due ${relDay(due, today).toLowerCase()}`
          : "No delivery date set",
        when: due,
        urgent: n <= 2,
        advance: "Mark delivered",
      })
    }

    if (job.status === "delivered") {
      const when = job.reminders.find((reminder) => !reminder.done)?.dueOn ?? today
      tasks.push({
        key: `pay-${job.id}`,
        lane: "desk",
        jobId: job.id,
        clientName: job.clientName,
        jobTitle: job.title,
        craft: job.craft,
        status: job.status,
        taskTitle: "Chase the invoice",
        detail: "Delivered — waiting on payment",
        when,
        urgent: when <= today,
        advance: "Mark paid",
      })
    } else if (job.status === "new" || job.status === "contacted" || job.status === "quoted") {
      const due = job.reminders
        .filter((reminder) => !reminder.done && reminder.dueOn <= soon)
        .sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0]
      if (due) {
        usedReminders.add(due.id)
        const taskTitle =
          job.status === "new"
            ? "Reply to the lead"
            : job.status === "contacted"
              ? "Send the quote"
              : "Nudge on the quote"
        tasks.push({
          key: `fu-${job.id}`,
          lane: "desk",
          jobId: job.id,
          clientName: job.clientName,
          jobTitle: job.title,
          craft: job.craft,
          status: job.status,
          taskTitle,
          detail: `Follow-up ${relDay(due.dueOn, today).toLowerCase()}`,
          when: due.dueOn,
          urgent: due.dueOn <= today,
          advance: job.status === "quoted" ? "Booked" : undefined,
        })
      }
    }

    if (job.status === "booked" && !job.depositReceived) {
      tasks.push({
        key: `dep-${job.id}`,
        lane: "desk",
        jobId: job.id,
        clientName: job.clientName,
        jobTitle: job.title,
        craft: job.craft,
        status: job.status,
        taskTitle: "Confirm the deposit",
        detail: "Booked, deposit not received",
        when: job.shootDate ?? today,
        urgent: false,
      })
    }

    for (const reminder of job.reminders) {
      if (reminder.done || !reminder.dueOn || reminder.dueOn > soon || usedReminders.has(reminder.id)) continue
      tasks.push({
        key: `rem-${reminder.id}`,
        lane: "desk",
        jobId: job.id,
        clientName: job.clientName,
        jobTitle: job.title,
        craft: job.craft,
        status: job.status,
        taskTitle: reminder.body,
        detail: `Reminder · ${relDay(reminder.dueOn, today).toLowerCase()}`,
        when: reminder.dueOn,
        urgent: reminder.dueOn <= today,
        reminderId: reminder.id,
      })
    }
  }

  return tasks.sort((a, b) => a.when.localeCompare(b.when) || a.clientName.localeCompare(b.clientName))
}

export function craftLine(craft: Craft) {
  return craftShort(craft)
}
