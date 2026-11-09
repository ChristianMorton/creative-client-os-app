import { and, asc, desc, eq, ne } from "drizzle-orm"
import { db } from "@/db"
import {
  calendarEvents,
  folders,
  jobs,
  notes,
  packingItems,
  packingTemplates,
  quotes,
  reminders,
} from "@/db/schema"
import { googleAuthFor } from "@/lib/google-auth"
import { deleteGoogleEvent, mockEvent, upsertGoogleEvent } from "@/lib/integrations/calendar"
import { createDriveTree, mockFolders, type FolderDraft } from "@/lib/integrations/drive"
import {
  createDropboxTree,
  dropboxAccessToken,
  dropboxConfigured,
} from "@/lib/integrations/dropbox"
import { dollarsToCents } from "@/lib/format"
import {
  canTransition,
  folderPlan,
  isBookedOrLater,
  type CalendarKind,
  type Craft,
  type JobStatus,
} from "@/lib/pipeline"
import type { Result, ResultWithId } from "@/lib/result"

async function ownedJob(userId: string, jobId: string) {
  return (
    (await db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.userId, userId)),
    })) ?? null
  )
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function optionalEmail(value: string | null | undefined) {
  const email = value?.trim() ?? ""
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined
  return email
}

export async function createJob(
  userId: string,
  input: {
    clientName: string
    clientEmail?: string
    title: string
    craft: Craft
    shootDate?: string | null
    deliveryDue?: string | null
  },
): Promise<ResultWithId> {
  const clientName = clean(input.clientName ?? "")
  const title = clean(input.title ?? "")
  const email = optionalEmail(input.clientEmail)
  if (!clientName || !title) return { ok: false, error: "Client and title are required." }
  if (email === undefined) return { ok: false, error: "That email doesn’t look right." }
  if (!["photographer", "cinematographer", "editor"].includes(input.craft)) {
    return { ok: false, error: "Pick a craft." }
  }
  const shootDate = input.shootDate?.trim() || null
  const deliveryDue = input.deliveryDue?.trim() || null
  if ((shootDate && !/^\d{4}-\d{2}-\d{2}$/.test(shootDate)) || (deliveryDue && !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDue))) {
    return { ok: false, error: "Use a real date." }
  }
  const id = crypto.randomUUID()
  await db.insert(jobs).values({
    id,
    userId,
    clientName,
    clientEmail: email,
    title,
    craft: input.craft,
    status: "new",
    shootDate,
    deliveryDue,
    revisionRounds: 2,
  })
  return { ok: true, id }
}

export async function updateJob(
  userId: string,
  jobId: string,
  patch: {
    clientName?: string
    clientEmail?: string
    title?: string
    craft?: Craft
    shootDate?: string | null
    deliveryDue?: string | null
    footageHours?: number | null
    revisionRounds?: number
    changeOrder?: boolean
  },
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }

  const next: Partial<typeof jobs.$inferInsert> = { updatedAt: new Date() }
  if (patch.clientName !== undefined) {
    const clientName = clean(patch.clientName)
    if (!clientName) return { ok: false, error: "Client name can’t be empty." }
    next.clientName = clientName
  }
  if (patch.title !== undefined) {
    const title = clean(patch.title)
    if (!title) return { ok: false, error: "Title can’t be empty." }
    next.title = title
  }
  if (patch.clientEmail !== undefined) {
    const email = optionalEmail(patch.clientEmail)
    if (email === undefined) return { ok: false, error: "That email doesn’t look right." }
    next.clientEmail = email
  }
  if (patch.craft !== undefined) next.craft = patch.craft
  if (patch.shootDate !== undefined) {
    const shootDate = patch.shootDate?.trim() || null
    if (shootDate && !/^\d{4}-\d{2}-\d{2}$/.test(shootDate)) {
      return { ok: false, error: "Use a real shoot date." }
    }
    next.shootDate = shootDate
  }
  if (patch.deliveryDue !== undefined) {
    const deliveryDue = patch.deliveryDue?.trim() || null
    if (deliveryDue && !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDue)) {
      return { ok: false, error: "Use a real delivery date." }
    }
    next.deliveryDue = deliveryDue
  }
  if (patch.footageHours !== undefined) {
    if (patch.footageHours !== null && (Number.isNaN(patch.footageHours) || patch.footageHours < 0 || patch.footageHours > 999)) {
      return { ok: false, error: "Footage hours should be between 0 and 999." }
    }
    next.footageHours = patch.footageHours
  }
  if (patch.revisionRounds !== undefined) {
    if (!Number.isInteger(patch.revisionRounds) || patch.revisionRounds < 0 || patch.revisionRounds > 99) {
      return { ok: false, error: "Revision rounds should be a whole number." }
    }
    next.revisionRounds = patch.revisionRounds
  }
  if (patch.changeOrder !== undefined) next.changeOrder = patch.changeOrder

  await db.update(jobs).set(next).where(eq(jobs.id, jobId))
  if (isBookedOrLater(job.status) && (patch.shootDate !== undefined || patch.deliveryDue !== undefined || patch.clientName !== undefined || patch.title !== undefined)) {
    await syncCalendar(userId, jobId)
  }
  return { ok: true }
}

export async function transitionJob(
  userId: string,
  jobId: string,
  to: JobStatus,
  lostReason?: string,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  if (!canTransition(job.status, to)) {
    return { ok: false, error: "That move isn’t on this job’s path." }
  }
  await db
    .update(jobs)
    .set({
      status: to,
      lostReason: to === "lost" ? clean(lostReason ?? "") || null : job.lostReason,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
  if (isBookedOrLater(to)) {
    await ensureFolders(userId, jobId)
    await syncCalendar(userId, jobId)
  }
  return { ok: true }
}

export async function setTrustedClient(
  userId: string,
  jobId: string,
  trusted: boolean,
  confirmName?: string,
  acknowledged?: boolean,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  if (!isBookedOrLater(job.status)) {
    return { ok: false, error: "Delivery exists once the job is booked." }
  }
  if (trusted) {
    const typed = clean(confirmName ?? "").toLowerCase()
    if (!acknowledged || typed !== job.clientName.toLowerCase()) {
      return { ok: false, error: "Type the client name and confirm before unlocking." }
    }
  }
  await db
    .update(jobs)
    .set({ trustedClient: trusted, updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
  return { ok: true }
}

async function upsertFolderRows(
  jobId: string,
  provider: "google_drive" | "dropbox",
  drafts: FolderDraft[],
) {
  for (const draft of drafts) {
    await db
      .insert(folders)
      .values({
        id: crypto.randomUUID(),
        jobId,
        provider,
        kind: draft.kind,
        name: draft.name,
        path: draft.path,
        externalId: draft.externalId,
        url: draft.url,
        stubbed: draft.stubbed,
      })
      .onConflictDoUpdate({
        target: [folders.jobId, folders.provider, folders.kind],
        set: {
          name: draft.name,
          path: draft.path,
          externalId: draft.externalId,
          url: draft.url,
          stubbed: draft.stubbed,
        },
      })
  }
}

export async function ensureFolders(userId: string, jobId: string) {
  await ensureDriveFolders(userId, jobId)
  if (!dropboxConfigured()) return
  await ensureDropboxFolders(userId, jobId)
}

async function ensureDriveFolders(userId: string, jobId: string) {
  const job = await ownedJob(userId, jobId)
  if (!job) return
  const existing = await db
    .select()
    .from(folders)
    .where(and(eq(folders.jobId, jobId), eq(folders.provider, "google_drive")))
  const auth = await googleAuthFor(userId)
  const needsReal = Boolean(auth) && (existing.length < 5 || existing.some((folder) => folder.stubbed))
  if (needsReal && auth) {
    try {
      const created = await createDriveTree(auth, job.clientName, job.title)
      await upsertFolderRows(jobId, "google_drive", created)
      return
    } catch (error) {
      console.warn(
        "[drive] using a local mock",
        error instanceof Error ? error.message : error,
      )
    }
  }
  if (existing.length >= 5 && existing.every((folder) => !folder.stubbed || !auth)) {
    const plan = folderPlan(job.clientName, job.title)
    const stale = existing.some((folder) => {
      const match = plan.folders.find((item) => item.kind === folder.kind)
      return folder.stubbed && match && (match.path !== folder.path || match.name !== folder.name)
    })
    if (!stale) return
  }
  if (existing.length >= 5 && !existing.some((folder) => folder.stubbed)) return
  await upsertFolderRows(jobId, "google_drive", mockFolders(jobId, job.clientName, job.title))
}

export async function ensureDropboxFolders(userId: string, jobId: string): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  if (!isBookedOrLater(job.status)) {
    return { ok: false, error: "Dropbox folders are created once the job is booked." }
  }
  if (!dropboxConfigured()) return { ok: false, error: "Dropbox isn’t connected." }
  const existing = await db
    .select()
    .from(folders)
    .where(and(eq(folders.jobId, jobId), eq(folders.provider, "dropbox")))
  if (existing.length >= 5) return { ok: true }
  try {
    const token = await dropboxAccessToken()
    const created = await createDropboxTree(token, job.clientName, job.title)
    await upsertFolderRows(jobId, "dropbox", created)
    return { ok: true }
  } catch (error) {
    console.warn("[dropbox]", error instanceof Error ? error.message : error)
    return { ok: false, error: "Dropbox could not create those folders." }
  }
}

export async function syncCalendar(userId: string, jobId: string) {
  const job = await ownedJob(userId, jobId)
  if (!job || !isBookedOrLater(job.status)) return
  const auth = await googleAuthFor(userId)
  await syncOne(job, auth, "shoot", job.shootDate, `Shoot · ${job.clientName} · ${job.title}`)
  await syncOne(job, auth, "delivery", job.deliveryDue, `Delivery due · ${job.clientName} · ${job.title}`)
}

async function syncOne(
  job: { id: string; clientName: string; title: string },
  auth: Awaited<ReturnType<typeof googleAuthFor>>,
  kind: CalendarKind,
  startsOn: string | null,
  title: string,
) {
  const existing = await db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.jobId, job.id), eq(calendarEvents.kind, kind)),
  })
  if (!startsOn) {
    if (existing?.externalId && !existing.stubbed && auth) {
      try {
        await deleteGoogleEvent(auth, existing.externalId)
      } catch (error) {
        console.warn(
          "[calendar] could not delete event",
          error instanceof Error ? error.message : error,
        )
      }
    }
    if (existing) await db.delete(calendarEvents).where(eq(calendarEvents.id, existing.id))
    return
  }

  if (auth) {
    try {
      const saved = await upsertGoogleEvent(auth, {
        externalId: existing?.externalId,
        stubbed: existing?.stubbed,
        title,
        startsOn,
        description: `Creative Client OS\n${job.clientName} — ${job.title}`,
      })
      await upsertEventRow(job.id, {
        kind,
        title,
        startsOn,
        externalId: saved.externalId,
        htmlLink: saved.htmlLink,
        stubbed: false,
      })
      return
    } catch (error) {
      console.warn(
        "[calendar] using a local mock",
        error instanceof Error ? error.message : error,
      )
    }
  }

  const mock = mockEvent(job.id, kind, title, startsOn)
  await upsertEventRow(job.id, mock)
}

async function upsertEventRow(
  jobId: string,
  draft: {
    kind: CalendarKind
    title: string
    startsOn: string
    externalId: string
    htmlLink: string
    stubbed: boolean
  },
) {
  await db
    .insert(calendarEvents)
    .values({
      id: crypto.randomUUID(),
      jobId,
      kind: draft.kind,
      title: draft.title,
      startsOn: draft.startsOn,
      externalId: draft.externalId,
      htmlLink: draft.htmlLink,
      stubbed: draft.stubbed,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [calendarEvents.jobId, calendarEvents.kind],
      set: {
        title: draft.title,
        startsOn: draft.startsOn,
        externalId: draft.externalId,
        htmlLink: draft.htmlLink,
        stubbed: draft.stubbed,
        updatedAt: new Date(),
      },
    })
}

export async function saveQuote(
  userId: string,
  jobId: string,
  input: { amount: string; deposit: string; summary: string },
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const amountCents = dollarsToCents(input.amount)
  const depositCents = dollarsToCents(input.deposit || "0")
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Enter the quote as dollars." }
  }
  if (depositCents === null || depositCents < 0) {
    return { ok: false, error: "Enter the deposit as dollars." }
  }
  if (depositCents > amountCents) {
    return { ok: false, error: "The deposit can’t be larger than the quote." }
  }
  const summary = input.summary.trim() || null
  const existing = await db.query.quotes.findFirst({ where: eq(quotes.jobId, jobId) })
  if (existing) {
    await db
      .update(quotes)
      .set({ amountCents, depositCents, summary, updatedAt: new Date() })
      .where(eq(quotes.id, existing.id))
  } else {
    await db.insert(quotes).values({
      id: crypto.randomUUID(),
      jobId,
      amountCents,
      depositCents,
      summary,
    })
  }
  await db.update(jobs).set({ updatedAt: new Date() }).where(eq(jobs.id, jobId))
  return { ok: true }
}

export async function setDepositReceived(
  userId: string,
  jobId: string,
  received: boolean,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.jobId, jobId) })
  if (!quote) return { ok: false, error: "Add a quote before marking the deposit." }
  await db
    .update(quotes)
    .set({ depositReceivedAt: received ? new Date() : null, updatedAt: new Date() })
    .where(eq(quotes.id, quote.id))
  return { ok: true }
}

export async function addNote(userId: string, jobId: string, body: string): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const text = body.trim()
  if (!text) return { ok: false, error: "Write a note first." }
  if (text.length > 4000) return { ok: false, error: "Keep the note under 4,000 characters." }
  await db.insert(notes).values({ id: crypto.randomUUID(), jobId, body: text, pinned: false })
  return { ok: true }
}

export async function setNotePinned(
  userId: string,
  jobId: string,
  noteId: string,
  pinned: boolean,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.jobId, jobId)),
  })
  if (!note) return { ok: false, error: "Note not found." }
  await db.update(notes).set({ pinned }).where(eq(notes.id, noteId))
  return { ok: true }
}

export async function deleteNote(userId: string, jobId: string, noteId: string): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.jobId, jobId)))
  return { ok: true }
}

export async function addReminder(
  userId: string,
  jobId: string,
  body: string,
  dueOn: string,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const text = body.trim()
  if (!text) return { ok: false, error: "Write the follow-up first." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return { ok: false, error: "Pick a due date." }
  await db.insert(reminders).values({
    id: crypto.randomUUID(),
    jobId,
    body: text,
    dueAt: new Date(`${dueOn}T12:00:00.000Z`),
  })
  return { ok: true }
}

export async function setReminderDone(
  userId: string,
  jobId: string,
  reminderId: string,
  done: boolean,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const reminder = await db.query.reminders.findFirst({
    where: and(eq(reminders.id, reminderId), eq(reminders.jobId, jobId)),
  })
  if (!reminder) return { ok: false, error: "Follow-up not found." }
  await db
    .update(reminders)
    .set({ completedAt: done ? new Date() : null })
    .where(eq(reminders.id, reminderId))
  return { ok: true }
}

async function replacePacking(userId: string, jobId: string, labels: string[]): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  await db.delete(packingItems).where(eq(packingItems.jobId, jobId))
  if (labels.length) {
    await db.insert(packingItems).values(
      labels.map((label, index) => ({
        id: crypto.randomUUID(),
        jobId,
        label,
        checked: false,
        sortOrder: index,
      })),
    )
  }
  return { ok: true }
}

export async function loadPackingTemplate(
  userId: string,
  jobId: string,
  craft: "photographer" | "cinematographer",
): Promise<Result> {
  const template = await db.query.packingTemplates.findFirst({
    where: eq(packingTemplates.craft, craft),
    with: { items: true },
  })
  if (!template) return { ok: false, error: "That kit isn’t in the studio yet." }
  const items = [...template.items].sort((a, b) => a.sortOrder - b.sortOrder)
  return replacePacking(
    userId,
    jobId,
    items.map((item) => item.label),
  )
}

export async function copyPackingFromLast(userId: string, jobId: string): Promise<Result> {
  const latest = await db
    .select({ id: jobs.id })
    .from(jobs)
    .innerJoin(packingItems, eq(packingItems.jobId, jobs.id))
    .where(and(eq(jobs.userId, userId), ne(jobs.id, jobId)))
    .orderBy(desc(jobs.updatedAt))
    .limit(1)
  if (!latest[0]) return { ok: false, error: "No earlier job has a packing list." }
  const items = await db
    .select()
    .from(packingItems)
    .where(eq(packingItems.jobId, latest[0].id))
    .orderBy(asc(packingItems.sortOrder))
  return replacePacking(
    userId,
    jobId,
    items.map((item) => item.label),
  )
}

export async function addPackingItem(userId: string, jobId: string, label: string): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const text = clean(label)
  if (!text) return { ok: false, error: "Name the item." }
  const existing = await db
    .select({ sortOrder: packingItems.sortOrder })
    .from(packingItems)
    .where(eq(packingItems.jobId, jobId))
    .orderBy(desc(packingItems.sortOrder))
    .limit(1)
  await db.insert(packingItems).values({
    id: crypto.randomUUID(),
    jobId,
    label: text,
    checked: false,
    sortOrder: (existing[0]?.sortOrder ?? -1) + 1,
  })
  return { ok: true }
}

export async function togglePackingItem(
  userId: string,
  jobId: string,
  itemId: string,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  const item = await db.query.packingItems.findFirst({
    where: and(eq(packingItems.id, itemId), eq(packingItems.jobId, jobId)),
  })
  if (!item) return { ok: false, error: "That item is gone." }
  await db.update(packingItems).set({ checked: !item.checked }).where(eq(packingItems.id, itemId))
  return { ok: true }
}

export async function removePackingItem(
  userId: string,
  jobId: string,
  itemId: string,
): Promise<Result> {
  const job = await ownedJob(userId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  await db.delete(packingItems).where(and(eq(packingItems.id, itemId), eq(packingItems.jobId, jobId)))
  return { ok: true }
}
