import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { jobs } from "@/db/schema"
import { addDaysKey, dayKey, FOLDER_KINDS, todayKey, type FolderKind } from "@/lib/pipeline"

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

export async function listJobs(userId: string) {
  const rows = await db.query.jobs.findMany({
    where: eq(jobs.userId, userId),
    with: { quote: true, reminders: true },
    orderBy: [desc(jobs.updatedAt)],
  })
  const today = todayKey()
  return rows.map((job) => ({
    id: job.id,
    clientName: job.clientName,
    title: job.title,
    craft: job.craft,
    status: job.status,
    shootDate: job.shootDate,
    deliveryDue: job.deliveryDue,
    changeOrder: job.changeOrder,
    trustedClient: job.trustedClient,
    updatedAt: job.updatedAt.toISOString(),
    depositReceived: Boolean(job.quote?.depositReceivedAt),
    hasQuote: Boolean(job.quote),
    depositCents: job.quote?.depositCents ?? 0,
    amountCents: job.quote?.amountCents ?? null,
    followUp: job.reminders.some(
      (reminder) => !reminder.completedAt && dayKey(reminder.dueAt) <= today,
    ),
  }))
}

export async function listFollowUps(userId: string) {
  const rows = await db.query.jobs.findMany({
    where: eq(jobs.userId, userId),
    with: { reminders: true },
  })
  const today = todayKey()
  const horizon = addDaysKey(7)
  return rows
    .flatMap((job) =>
      job.reminders
        .filter((reminder) => !reminder.completedAt && dayKey(reminder.dueAt) <= horizon)
        .map((reminder) => ({
          id: reminder.id,
          jobId: job.id,
          clientName: job.clientName,
          title: job.title,
          status: job.status,
          body: reminder.body,
          dueOn: dayKey(reminder.dueAt),
          overdue: dayKey(reminder.dueAt) < today,
        })),
    )
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

export async function getJob(userId: string, jobId: string) {
  const job = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, jobId), eq(jobs.userId, userId)),
    with: {
      quote: true,
      notes: true,
      reminders: true,
      packingItems: true,
      folders: true,
      calendarEvents: true,
    },
  })
  if (!job) return null
  const notes = [...job.notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
  const packing = [...job.packingItems].sort((a, b) => a.sortOrder - b.sortOrder)
  const folderRows = [...job.folders].sort((a, b) => {
    if (a.provider !== b.provider) return a.provider === "google_drive" ? -1 : 1
    return FOLDER_KINDS.indexOf(a.kind as FolderKind) - FOLDER_KINDS.indexOf(b.kind as FolderKind)
  })
  return {
    id: job.id,
    clientName: job.clientName,
    clientEmail: job.clientEmail,
    title: job.title,
    craft: job.craft,
    status: job.status,
    shootDate: job.shootDate,
    deliveryDue: job.deliveryDue,
    footageHours: job.footageHours,
    revisionRounds: job.revisionRounds,
    changeOrder: job.changeOrder,
    trustedClient: job.trustedClient,
    lostReason: job.lostReason,
    quote: job.quote
      ? {
          amountCents: job.quote.amountCents,
          depositCents: job.quote.depositCents,
          currency: job.quote.currency,
          summary: job.quote.summary,
          depositReceivedAt: iso(job.quote.depositReceivedAt),
        }
      : null,
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      pinned: note.pinned,
      createdAt: note.createdAt.toISOString(),
    })),
    reminders: [...job.reminders]
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .map((reminder) => ({
        id: reminder.id,
        body: reminder.body,
        dueOn: dayKey(reminder.dueAt),
        done: Boolean(reminder.completedAt),
      })),
    packingItems: packing.map((item) => ({
      id: item.id,
      label: item.label,
      checked: item.checked,
    })),
    folders: folderRows.map((folder) => ({
      id: folder.id,
      provider: folder.provider,
      kind: folder.kind,
      name: folder.name,
      path: folder.path,
      url: folder.url,
      stubbed: folder.stubbed,
    })),
    events: job.calendarEvents.map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      startsOn: event.startsOn,
      htmlLink: event.htmlLink,
      stubbed: event.stubbed,
    })),
  }
}

export async function listCallSheet(userId: string) {
  const rows = await db.query.jobs.findMany({
    where: eq(jobs.userId, userId),
    with: { quote: true, reminders: true, packingItems: true },
  })
  return rows.map((job) => ({
    id: job.id,
    clientName: job.clientName,
    title: job.title,
    craft: job.craft,
    status: job.status,
    shootDate: job.shootDate,
    deliveryDue: job.deliveryDue,
    depositReceived: Boolean(job.quote?.depositReceivedAt),
    packing: job.packingItems.map((item) => ({ checked: item.checked })),
    reminders: job.reminders.map((reminder) => ({
      id: reminder.id,
      body: reminder.body,
      dueOn: dayKey(reminder.dueAt),
      done: Boolean(reminder.completedAt),
    })),
  }))
}

export type JobListItem = Awaited<ReturnType<typeof listJobs>>[number]
export type JobDetail = NonNullable<Awaited<ReturnType<typeof getJob>>>
export type CallSheetJob = Awaited<ReturnType<typeof listCallSheet>>[number]
