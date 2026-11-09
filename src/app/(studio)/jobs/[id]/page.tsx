import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Calendar, Folder } from "lucide-react"
import { auth } from "@/auth"
import { DeliveryLock } from "@/components/delivery-lock"
import { DropboxFolderButton } from "@/components/dropbox-folder-button"
import { JobDetailsForm } from "@/components/job-details-form"
import { NotesPanel } from "@/components/notes-panel"
import { PackingList } from "@/components/packing-list"
import { QuotePanel } from "@/components/quote-panel"
import { RemindersPanel } from "@/components/reminders-panel"
import { Section } from "@/components/section"
import { StatusAction } from "@/components/status-action"
import { formatDay } from "@/lib/format"
import { dropboxStatus } from "@/lib/integrations/dropbox"
import type { JobDetail } from "@/lib/queries"
import {
  craftLabel,
  deliveryUnlocked,
  HAPPY_PATH,
  nextActionCopy,
  statusDot,
  statusLabel,
} from "@/lib/pipeline"
import { getJob } from "@/lib/queries"
import { cn } from "cn"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return { title: "Job" }
  const job = await getJob(session.user.id, id)
  return { title: job ? job.clientName : "Job" }
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const { id } = await params
  const job = await getJob(session.user.id, id)
  if (!job) notFound()
  const booked =
    job.status === "booked" ||
    job.status === "in_progress" ||
    job.status === "delivered" ||
    job.status === "paid"
  const unlocked = deliveryUnlocked(job)
  const current = HAPPY_PATH.indexOf(job.status as (typeof HAPPY_PATH)[number])

  return (
    <div className="safelight min-h-full px-6 py-8 md:px-10">
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Pipeline
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", statusDot(job.status))} />
            {statusLabel(job.status)}
          </span>
          <span>·</span>
          <span>{craftLabel(job.craft)}</span>
        </div>
        <h1 className="mt-2 font-serif text-5xl leading-none md:text-6xl">{job.clientName}</h1>
        <p className="mt-2 text-muted-foreground">{job.title}</p>

        {current >= 0 ? (
          <div className="mt-6 flex gap-1">
            {HAPPY_PATH.map((step, index) => (
              <div key={step} className="flex-1 text-left" title={statusLabel(step)}>
                <div className={cn("h-1 rounded-full", index <= current ? statusDot(step) : "bg-border")} />
                <div
                  className={cn(
                    "mt-1.5 hidden text-[11px] sm:block",
                    step === job.status ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {statusLabel(step)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-accent/60 p-5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Next</div>
            <div className="font-serif text-2xl italic">{nextActionCopy(job.status)}</div>
            {job.status === "lost" && job.lostReason ? (
              <div className="text-xs text-muted-foreground">Lost: {job.lostReason}</div>
            ) : null}
          </div>
          <StatusAction job={{ id: job.id, status: job.status, clientName: job.clientName }} />
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <JobDetailsForm job={job} />
          <NotesPanel jobId={job.id} notes={job.notes} />
          <PackingList jobId={job.id} items={job.packingItems} />
          <QuotePanel jobId={job.id} quote={job.quote} />
        </div>
        <div className="space-y-5">
          <Section title="Client delivery">
            <DeliveryLock
              jobId={job.id}
              clientName={job.clientName}
              status={job.status}
              trustedClient={job.trustedClient}
            />
          </Section>
          <Section title="Folders & calendar">
            <FoldersAndCalendar job={job} booked={booked} unlocked={unlocked} />
          </Section>
          <RemindersPanel jobId={job.id} reminders={job.reminders} />
        </div>
      </div>
    </div>
  )
}

function FoldersAndCalendar({
  job,
  booked,
  unlocked,
}: {
  job: JobDetail
  booked: boolean
  unlocked: boolean
}) {
  if (!booked) {
    return (
      <p className="text-sm text-muted-foreground">
        Folders appear automatically when the job is Booked. Shoot and delivery go on the calendar then too.
      </p>
    )
  }

  const drive = job.folders.filter((folder) => folder.provider === "google_drive")
  const dropbox = job.folders.filter((folder) => folder.provider === "dropbox")

  return (
    <div className="space-y-4">
      <p className="font-mono text-[11px] text-muted-foreground">
        /{job.clientName}/{job.title}
      </p>
      <FolderGroup folders={drive} unlocked={unlocked} />
      {dropbox.length > 0 ? <FolderGroup folders={dropbox} unlocked={unlocked} /> : null}
      <DropboxNote jobId={job.id} hasDropbox={dropbox.length > 0} />
      <ul className="space-y-1 border-t border-border pt-3">
        {(["shoot", "delivery"] as const).map((kind) => {
          const event = job.events.find((item) => item.kind === kind)
          const label = kind === "shoot" ? "Shoot" : "Delivery due"
          const date = kind === "shoot" ? job.shootDate : job.deliveryDue
          return (
            <li key={kind} className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">
                {label}
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  {date ? formatDay(date) : "No date"}
                </span>
              </span>
              {event?.stubbed ? (
                <Tag>Local</Tag>
              ) : event?.htmlLink ? (
                <a href={event.htmlLink} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline">
                  Calendar
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">{event ? "Scheduled" : "Not scheduled"}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FolderGroup({
  folders,
  unlocked,
}: {
  folders: JobDetail["folders"]
  unlocked: boolean
}) {
  if (folders.length === 0) return null
  return (
    <ul className="space-y-1">
      {folders.map((folder) => {
        const locked = folder.kind === "delivery" && !unlocked
        return (
          <li key={folder.id} className="flex items-center gap-2 text-sm">
            <Folder className="h-4 w-4 text-foreground" />
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            {locked ? (
              <span className="text-xs text-muted-foreground">Locked</span>
            ) : folder.stubbed ? (
              <Tag>Local</Tag>
            ) : folder.url ? (
              <a href={folder.url} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline">
                Open
              </a>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  )
}

function DropboxNote({ jobId, hasDropbox }: { jobId: string; hasDropbox: boolean }) {
  const dropbox = dropboxStatus()
  if (!dropbox.configured) {
    return <p className="text-[11px] text-muted-foreground">{dropbox.message}</p>
  }
  if (hasDropbox) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">Not in Dropbox yet.</p>
      <DropboxFolderButton jobId={jobId} />
    </div>
  )
}
