export const JOB_STATUSES = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "in_progress",
  "delivered",
  "paid",
  "lost",
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const CRAFTS = ["photographer", "cinematographer", "editor"] as const
export type Craft = (typeof CRAFTS)[number]

export const FOLDER_KINDS = ["root", "admin", "raw", "exports", "delivery"] as const
export type FolderKind = (typeof FOLDER_KINDS)[number]

export const CALENDAR_KINDS = ["shoot", "delivery"] as const
export type CalendarKind = (typeof CALENDAR_KINDS)[number]

export const HAPPY_PATH: JobStatus[] = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "in_progress",
  "delivered",
  "paid",
]

const TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["quoted", "lost"],
  quoted: ["booked", "lost"],
  booked: ["in_progress"],
  in_progress: ["delivered"],
  delivered: ["paid"],
  paid: [],
  lost: [],
}

const NEXT: Partial<Record<JobStatus, JobStatus>> = {
  new: "contacted",
  contacted: "quoted",
  quoted: "booked",
  booked: "in_progress",
  in_progress: "delivered",
  delivered: "paid",
}

const LABELS: Record<JobStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  in_progress: "In progress",
  delivered: "Delivered",
  paid: "Paid",
  lost: "Lost",
}

const CRAFT_LABELS: Record<Craft, string> = {
  photographer: "Photographer",
  cinematographer: "Cinematographer",
  editor: "Editor",
}

const CRAFT_SHORT: Record<Craft, string> = {
  photographer: "Photo",
  cinematographer: "Cine",
  editor: "Edit",
}

const NEXT_COPY: Record<JobStatus, string> = {
  new: "Reach out to the client",
  contacted: "Send a quote",
  quoted: "Confirm the booking",
  booked: "Start the shoot",
  in_progress: "Deliver the work",
  delivered: "Mark as paid",
  paid: "All wrapped",
  lost: "Closed",
}

const STATUS_DOT: Record<JobStatus, string> = {
  new: "bg-st-new",
  contacted: "bg-st-contacted",
  quoted: "bg-st-quoted",
  booked: "bg-st-booked",
  in_progress: "bg-st-in_progress",
  delivered: "bg-st-delivered",
  paid: "bg-st-paid",
  lost: "bg-st-lost",
}

const ACTION_LABELS: Partial<Record<JobStatus, string>> = {
  new: "Mark contacted",
  contacted: "Mark quoted",
  quoted: "Mark booked",
  booked: "Start job",
  in_progress: "Mark delivered",
  delivered: "Mark paid",
}

export function statusLabel(status: JobStatus) {
  return LABELS[status]
}

export function craftLabel(craft: Craft) {
  return CRAFT_LABELS[craft]
}

export function craftShort(craft: Craft) {
  return CRAFT_SHORT[craft]
}

export function nextActionCopy(status: JobStatus) {
  return NEXT_COPY[status]
}

export function statusDot(status: JobStatus) {
  return STATUS_DOT[status]
}

export function canTransition(from: JobStatus, to: JobStatus) {
  return TRANSITIONS[from].includes(to)
}

export function nextStatus(status: JobStatus) {
  return NEXT[status] ?? null
}

export function primaryActionLabel(status: JobStatus) {
  return ACTION_LABELS[status] ?? null
}

export function canMarkLost(status: JobStatus) {
  return status === "new" || status === "contacted" || status === "quoted"
}

export function isBookedOrLater(status: JobStatus) {
  return (
    status === "booked" ||
    status === "in_progress" ||
    status === "delivered" ||
    status === "paid"
  )
}

export function deliveryUnlocked(job: { status: JobStatus; trustedClient: boolean }) {
  return job.status === "paid" || job.trustedClient
}

export function sanitizeSegment(value: string) {
  const cleaned = value.replace(/[\\/]/g, "–").replace(/\s+/g, " ").trim()
  return cleaned || "Untitled"
}

export function folderPlan(clientName: string, jobTitle: string) {
  const client = sanitizeSegment(clientName)
  const job = sanitizeSegment(jobTitle)
  const root = `/${client}/${job}`
  return {
    client,
    job,
    folders: [
      { kind: "root" as const, name: job, path: root },
      { kind: "admin" as const, name: "01-admin", path: `${root}/01-admin` },
      { kind: "raw" as const, name: "02-raw", path: `${root}/02-raw` },
      { kind: "exports" as const, name: "03-exports", path: `${root}/03-exports` },
      {
        kind: "delivery" as const,
        name: "04-client-delivery",
        path: `${root}/04-client-delivery`,
      },
    ],
  }
}

export function nextDay(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function dayKey(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

export function addDaysKey(days: number, now = new Date()) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
