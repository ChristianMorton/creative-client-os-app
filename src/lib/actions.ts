"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signIn, signOut } from "@/auth"
import type { Craft, JobStatus } from "@/lib/pipeline"
import type { Result } from "@/lib/result"
import {
  addNote,
  addPackingItem,
  addReminder,
  copyPackingFromLast,
  createJob,
  deleteNote,
  ensureDropboxFolders,
  loadPackingTemplate,
  removePackingItem,
  saveQuote,
  setDepositReceived,
  setNotePinned,
  setReminderDone,
  setTrustedClient,
  togglePackingItem,
  transitionJob,
  updateJob,
} from "@/lib/service"

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  return {
    id: session.user.id,
    name: session.user.name ?? "Studio",
    email: session.user.email ?? "",
  }
}

function refreshJob(jobId: string) {
  revalidatePath("/today")
  revalidatePath("/pipeline")
  revalidatePath("/jobs")
  revalidatePath(`/jobs/${jobId}`)
}

export async function signInDev() {
  await signIn("dev", { redirectTo: "/today" })
}

export async function signInGoogle() {
  await signIn("google", { redirectTo: "/today" })
}

export async function signOutStudio() {
  await signOut({ redirectTo: "/signin" })
}

export async function createJobAction(input: {
  clientName: string
  clientEmail?: string
  title: string
  craft: Craft
  shootDate?: string
  deliveryDue?: string
}) {
  const user = await requireUser()
  const result = await createJob(user.id, input)
  if (!result.ok) return result
  revalidatePath("/pipeline")
  revalidatePath("/jobs")
  redirect(`/jobs/${result.id}`)
}

export async function updateJobAction(
  jobId: string,
  patch: Parameters<typeof updateJob>[2],
): Promise<Result> {
  const user = await requireUser()
  const result = await updateJob(user.id, jobId, patch)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function createDropboxFoldersAction(jobId: string): Promise<Result> {
  const user = await requireUser()
  const result = await ensureDropboxFolders(user.id, jobId)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function transitionJobAction(
  jobId: string,
  to: JobStatus,
  lostReason?: string,
): Promise<Result> {
  const user = await requireUser()
  const result = await transitionJob(user.id, jobId, to, lostReason)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function setTrustedClientAction(
  jobId: string,
  trusted: boolean,
  confirmName?: string,
  acknowledged?: boolean,
): Promise<Result> {
  const user = await requireUser()
  const result = await setTrustedClient(user.id, jobId, trusted, confirmName, acknowledged)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function saveQuoteAction(
  jobId: string,
  input: { amount: string; deposit: string; summary: string },
): Promise<Result> {
  const user = await requireUser()
  const result = await saveQuote(user.id, jobId, input)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function setDepositReceivedAction(jobId: string, received: boolean): Promise<Result> {
  const user = await requireUser()
  const result = await setDepositReceived(user.id, jobId, received)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function addNoteAction(jobId: string, body: string): Promise<Result> {
  const user = await requireUser()
  const result = await addNote(user.id, jobId, body)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function setNotePinnedAction(
  jobId: string,
  noteId: string,
  pinned: boolean,
): Promise<Result> {
  const user = await requireUser()
  const result = await setNotePinned(user.id, jobId, noteId, pinned)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function deleteNoteAction(jobId: string, noteId: string): Promise<Result> {
  const user = await requireUser()
  const result = await deleteNote(user.id, jobId, noteId)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function addReminderAction(jobId: string, body: string, dueOn: string): Promise<Result> {
  const user = await requireUser()
  const result = await addReminder(user.id, jobId, body, dueOn)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function setReminderDoneAction(
  jobId: string,
  reminderId: string,
  done: boolean,
): Promise<Result> {
  const user = await requireUser()
  const result = await setReminderDone(user.id, jobId, reminderId, done)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function loadPackingTemplateAction(
  jobId: string,
  craft: "photographer" | "cinematographer",
): Promise<Result> {
  const user = await requireUser()
  const result = await loadPackingTemplate(user.id, jobId, craft)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function copyPackingAction(jobId: string): Promise<Result> {
  const user = await requireUser()
  const result = await copyPackingFromLast(user.id, jobId)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function addPackingItemAction(jobId: string, label: string): Promise<Result> {
  const user = await requireUser()
  const result = await addPackingItem(user.id, jobId, label)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function togglePackingItemAction(jobId: string, itemId: string): Promise<Result> {
  const user = await requireUser()
  const result = await togglePackingItem(user.id, jobId, itemId)
  if (result.ok) refreshJob(jobId)
  return result
}

export async function removePackingItemAction(jobId: string, itemId: string): Promise<Result> {
  const user = await requireUser()
  const result = await removePackingItem(user.id, jobId, itemId)
  if (result.ok) refreshJob(jobId)
  return result
}
