import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import { eq } from "drizzle-orm"
import { closeDb, db } from "../db"
import { folders, jobs, users } from "../db/schema"
import { DEV_USER_EMAIL, DEV_USER_ID, DEV_USER_NAME } from "./constants"
import { getJob } from "./queries"
import { deliveryUnlocked } from "./pipeline"
import {
  createJob,
  ensureDropboxFolders,
  ensureFolders,
  saveQuote,
  setDepositReceived,
  setTrustedClient,
  transitionJob,
  updateJob,
} from "./service"

describe("job service", () => {
  const created: string[] = []

  after(async () => {
    for (const id of created) {
      await db.delete(jobs).where(eq(jobs.id, id))
    }
    await closeDb()
  })

  it("books a job into mock folders and keeps delivery locked", async () => {
    await db
      .insert(users)
      .values({ id: DEV_USER_ID, email: DEV_USER_EMAIL, name: DEV_USER_NAME })
      .onConflictDoUpdate({ target: users.email, set: { name: DEV_USER_NAME } })

    const createdJob = await createJob(DEV_USER_ID, {
      clientName: "Test Atelier",
      title: "Lock check",
      craft: "photographer",
      shootDate: "2026-11-02",
      deliveryDue: "2026-11-16",
    })
    assert.equal(createdJob.ok, true)
    if (!createdJob.ok) return
    created.push(createdJob.id)

    const owned = await getJob(DEV_USER_ID, createdJob.id)
    assert.ok(owned)
    assert.equal(owned.title, "Lock check")
    assert.equal(await getJob("someone-else", createdJob.id), null)

    const seeded = await getJob(DEV_USER_ID, "10000000-0000-4000-8000-000000000002")
    assert.ok(seeded, "seeded jobs open for the dev studio session")
    assert.equal(seeded.clientName, "Mara Ellison")

    const skipped = await transitionJob(DEV_USER_ID, createdJob.id, "booked")
    assert.equal(skipped.ok, false)

    assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "contacted")).ok, true)
    assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "quoted")).ok, true)
    assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "booked")).ok, true)

    const stored = await db.query.jobs.findFirst({
      where: eq(jobs.id, createdJob.id),
      with: { folders: true, calendarEvents: true },
    })
    assert.ok(stored)
    assert.equal(stored.folders.length, 5)
    assert.ok(stored.folders.every((folder) => folder.stubbed))
    assert.ok(stored.folders.every((folder) => folder.provider === "google_drive"))
    assert.ok(stored.folders.some((folder) => folder.path.endsWith("/04-client-delivery")))
    assert.equal(deliveryUnlocked(stored), false)
    assert.equal(stored.calendarEvents.length, 2)
    assert.ok(stored.calendarEvents.every((event) => event.stubbed))

    const wrong = await setTrustedClient(DEV_USER_ID, createdJob.id, true, "Someone else", true)
    assert.equal(wrong.ok, false)
    const early = await setTrustedClient(DEV_USER_ID, createdJob.id, true, "Test Atelier", true)
    assert.equal(early.ok, true)
    const unlocked = await db.query.jobs.findFirst({ where: eq(jobs.id, createdJob.id) })
    assert.ok(unlocked)
    assert.equal(deliveryUnlocked(unlocked), true)

    assert.equal((await setTrustedClient(DEV_USER_ID, createdJob.id, false)).ok, true)
    const relocked = await db.query.jobs.findFirst({ where: eq(jobs.id, createdJob.id) })
    assert.ok(relocked)
    assert.equal(deliveryUnlocked(relocked), false)

    assert.equal((await saveQuote(DEV_USER_ID, createdJob.id, {
      amount: "1800",
      deposit: "600",
      summary: "Test quote",
    })).ok, true)
    assert.equal((await setDepositReceived(DEV_USER_ID, createdJob.id, true)).ok, true)

    assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "in_progress")).ok, true)
    assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "delivered")).ok, true)
    assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "paid")).ok, true)
    const paid = await db.query.jobs.findFirst({ where: eq(jobs.id, createdJob.id) })
    assert.ok(paid)
    assert.equal(deliveryUnlocked(paid), true)

    await updateJob(DEV_USER_ID, createdJob.id, { shootDate: "2026-11-03" })
    const moved = await db.query.jobs.findFirst({
      where: eq(jobs.id, createdJob.id),
      with: { calendarEvents: true },
    })
    const shoot = moved?.calendarEvents.find((event) => event.kind === "shoot")
    assert.equal(shoot?.startsOn, "2026-11-03")

    const count = await db.select().from(folders).where(eq(folders.jobId, createdJob.id))
    assert.equal(count.length, 5)
    await ensureFolders(DEV_USER_ID, createdJob.id)
    const again = await db.select().from(folders).where(eq(folders.jobId, createdJob.id))
    assert.equal(again.length, 5)

    const unconfigured = await ensureDropboxFolders(DEV_USER_ID, createdJob.id)
    assert.equal(unconfigured.ok, false)
    if (!unconfigured.ok) assert.match(unconfigured.error, /isn’t connected/)
    const stillDrive = await db.select().from(folders).where(eq(folders.jobId, createdJob.id))
    assert.equal(stillDrive.length, 5)
  })

  it("writes one dropbox tree when a token exists and does not write a second", async () => {
    await db
      .insert(users)
      .values({ id: DEV_USER_ID, email: DEV_USER_EMAIL, name: DEV_USER_NAME })
      .onConflictDoUpdate({ target: users.email, set: { name: DEV_USER_NAME } })

    const createdJob = await createJob(DEV_USER_ID, {
      clientName: "North Glass",
      title: "Showroom film",
      craft: "cinematographer",
    })
    assert.equal(createdJob.ok, true)
    if (!createdJob.ok) return
    created.push(createdJob.id)

    const calls: string[] = []
    const original = globalThis.fetch
    process.env.DROPBOX_ACCESS_TOKEN = "test-token"
    globalThis.fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { path?: string }
      calls.push(String(input))
      const path = body.path ?? ""
      return new Response(
        JSON.stringify({
          metadata: { id: `id:${path}`, path_display: path, name: path.split("/").pop() },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    try {
      const early = await ensureDropboxFolders(DEV_USER_ID, createdJob.id)
      assert.equal(early.ok, false)
      assert.equal(calls.length, 0)

      assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "contacted")).ok, true)
      assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "quoted")).ok, true)
      assert.equal((await transitionJob(DEV_USER_ID, createdJob.id, "booked")).ok, true)

      const rows = await db.select().from(folders).where(eq(folders.jobId, createdJob.id))
      const dropbox = rows.filter((folder) => folder.provider === "dropbox")
      const drive = rows.filter((folder) => folder.provider === "google_drive")
      assert.equal(drive.length, 5)
      assert.ok(drive.every((folder) => folder.stubbed))
      assert.equal(dropbox.length, 5)
      assert.ok(dropbox.every((folder) => !folder.stubbed))
      assert.ok(dropbox.some((folder) => folder.path.endsWith("/04-client-delivery")))
      assert.ok(dropbox.every((folder) => folder.url?.startsWith("https://www.dropbox.com/home/")))

      const before = calls.length
      const again = await ensureDropboxFolders(DEV_USER_ID, createdJob.id)
      assert.equal(again.ok, true)
      assert.equal(calls.length, before)
      const recount = await db.select().from(folders).where(eq(folders.jobId, createdJob.id))
      assert.equal(recount.filter((folder) => folder.provider === "dropbox").length, 5)
    } finally {
      globalThis.fetch = original
      delete process.env.DROPBOX_ACCESS_TOKEN
    }
  })
})
