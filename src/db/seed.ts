import "dotenv/config"
import { eq } from "drizzle-orm"
import { closeDb, db } from "@/db"
import {
  accounts,
  jobs,
  notes,
  packingItems,
  packingTemplateItems,
  packingTemplates,
  quotes,
  reminders,
  users,
} from "@/db/schema"
import { DEV_USER_EMAIL, DEV_USER_ID, DEV_USER_NAME } from "@/lib/constants"
import { KITS } from "@/lib/kits"
import { ensureFolders, syncCalendar } from "@/lib/service"
import type { Craft, JobStatus } from "@/lib/pipeline"

const IDS = {
  juniper: "10000000-0000-4000-8000-000000000001",
  mara: "10000000-0000-4000-8000-000000000002",
  northline: "10000000-0000-4000-8000-000000000003",
  hale: "10000000-0000-4000-8000-000000000004",
  oak: "10000000-0000-4000-8000-000000000005",
  vesper: "10000000-0000-4000-8000-000000000006",
  lumen: "10000000-0000-4000-8000-000000000007",
  metro: "10000000-0000-4000-8000-000000000008",
} as const

type SeedJob = {
  id: string
  clientName: string
  clientEmail: string
  title: string
  craft: Craft
  status: JobStatus
  shootDate?: string
  deliveryDue?: string
  footageHours?: number
  revisionRounds?: number
  changeOrder?: boolean
  lostReason?: string
  quote?: { amountCents: number; depositCents: number; summary: string; depositReceivedAt?: string }
  notes?: { body: string; pinned?: boolean }[]
  reminders?: { body: string; dueOn: string }[]
  packing?: { label: string; checked?: boolean }[]
}

const SEED: SeedJob[] = [
  {
    id: IDS.juniper,
    clientName: "Juniper House",
    clientEmail: "priya@juniperhouse-com.example",
    title: "Brand film, spring open house",
    craft: "cinematographer",
    status: "new",
    shootDate: "2026-10-18",
    deliveryDue: "2026-11-02",
    revisionRounds: 2,
    notes: [
      {
        body: "They want the garden in morning light. No drone. Priya is the contact at the house.",
      },
    ],
    reminders: [{ body: "Send a hold for the 18th", dueOn: "2026-10-01" }],
  },
  {
    id: IDS.mara,
    clientName: "Mara Ellison",
    clientEmail: "mara@ellison-co.example",
    title: "Ellison wedding, Napa",
    craft: "photographer",
    status: "contacted",
    shootDate: "2026-10-24",
    revisionRounds: 1,
    notes: [
      {
        body: "Mother of the bride wants a portrait list before the quote goes out.",
        pinned: true,
      },
      { body: "Ceremony is outdoors. Backup plan is the winery cellar." },
    ],
    reminders: [{ body: "Follow up on the ceremony timeline", dueOn: "2026-09-29" }],
  },
  {
    id: IDS.northline,
    clientName: "Northline Athletics",
    clientEmail: "bookings@northlineathletics-com.example",
    title: "Spring campaign stills",
    craft: "photographer",
    status: "quoted",
    shootDate: "2026-11-08",
    deliveryDue: "2026-11-20",
    revisionRounds: 2,
    quote: {
      amountCents: 480000,
      depositCents: 160000,
      summary: "Two looks, studio and track. Usage is site and paid social for 12 months.",
    },
    notes: [{ body: "Call sheet comes from their producer, not from us." }],
    reminders: [{ body: "Ask if the deposit can move this week", dueOn: "2026-10-03" }],
  },
  {
    id: IDS.hale,
    clientName: "Hale & Co.",
    clientEmail: "studio@haleandco-com.example",
    title: "Ceramic line, product film",
    craft: "editor",
    status: "booked",
    shootDate: "2026-10-04",
    deliveryDue: "2026-10-21",
    footageHours: 6.5,
    revisionRounds: 2,
    quote: {
      amountCents: 720000,
      depositCents: 240000,
      summary: "One hero film and three cutdowns. Glaze pour is the opening shot.",
      depositReceivedAt: "2026-09-20T15:00:00.000Z",
    },
    notes: [{ body: "Hero shot is the glaze pour. Hex references arrive Friday.", pinned: true }],
    reminders: [{ body: "Confirm the glaze hexes arrived", dueOn: "2026-10-02" }],
    packing: [
      "Camera body",
      "24mm",
      "35mm",
      "50mm",
      "ND set",
      "Batteries and charger",
      "Media formatted",
      "Monitor",
      "Tripod and head",
      "Key light",
      "Bounce",
      "Two lavs and a recorder",
      "Shotgun and boom",
      "Slate",
      "Gaff tape",
      "Rain cover",
    ].map((label, index) => ({ label, checked: index < 6 })),
  },
  {
    id: IDS.oak,
    clientName: "Oak & Iron",
    clientEmail: "hello@oakandiron-com.example",
    title: "Dining room rebrand",
    craft: "photographer",
    status: "in_progress",
    shootDate: "2026-09-18",
    deliveryDue: "2026-10-09",
    revisionRounds: 2,
    changeOrder: true,
    quote: {
      amountCents: 320000,
      depositCents: 120000,
      summary: "Dining room, kitchen pass, and details. Private dining was added after the shoot.",
      depositReceivedAt: "2026-09-01T15:00:00.000Z",
    },
    notes: [
      {
        body: "Change order: add the private dining room. Eighteen stills, not in the original set.",
        pinned: true,
      },
      { body: "Kitchen pass is the cover. The room was photographed before service." },
    ],
    packing: [
      "Body A and body B",
      "35mm",
      "50mm",
      "85mm",
      "Batteries charged",
      "Cards formatted",
      "Speedlight and trigger",
      "Reflector",
      "Tripod",
      "Tether cable",
      "Gray card",
      "Rain cover",
    ].map((label, index) => ({ label, checked: index < 9 })),
  },
  {
    id: IDS.vesper,
    clientName: "Vesper Studio",
    clientEmail: "edit@vesper-studio.example",
    title: "Lookbook motion cutdowns",
    craft: "editor",
    status: "delivered",
    shootDate: "2026-09-12",
    deliveryDue: "2026-09-28",
    footageHours: 4,
    revisionRounds: 3,
    quote: {
      amountCents: 560000,
      depositCents: 200000,
      summary: "15s, 6s, and a 30s for the site. Delivery stays locked until the balance clears.",
      depositReceivedAt: "2026-09-05T15:00:00.000Z",
    },
    notes: [
      {
        body: "Cutdowns are 15s, 6s, and a 30s for the site. Waiting on their legal line before anyone shares the link.",
      },
    ],
    packing: [
      { label: "Selects from the client", checked: true },
      { label: "15s cutdown", checked: true },
      { label: "6s cutdown", checked: true },
      { label: "30s site film", checked: true },
      { label: "Legal line in the end card", checked: false },
    ],
  },
  {
    id: IDS.lumen,
    clientName: "Lumen Archive",
    clientEmail: "desk@lumenarchive-com.example",
    title: "Founder portrait series",
    craft: "photographer",
    status: "paid",
    shootDate: "2026-09-02",
    deliveryDue: "2026-09-16",
    revisionRounds: 2,
    quote: {
      amountCents: 240000,
      depositCents: 80000,
      summary: "Four founders, one backdrop, one window. Balance arrived by wire.",
      depositReceivedAt: "2026-08-20T15:00:00.000Z",
    },
    notes: [{ body: "Balance landed by wire on Sep 20. Portraits are with the client." }],
    packing: [
      "Body A and body B",
      "35mm",
      "50mm",
      "85mm",
      "Batteries charged",
      "Cards formatted",
      "Speedlight and trigger",
      "Reflector",
      "Tripod",
      "Gray card",
    ].map((label) => ({ label, checked: true })),
  },
  {
    id: IDS.metro,
    clientName: "Metro Mile",
    clientEmail: "producer@metromile-film.example",
    title: "Marathon recap",
    craft: "cinematographer",
    status: "lost",
    shootDate: "2026-09-06",
    lostReason: "They pulled the recap in-house after the quote.",
    quote: {
      amountCents: 640000,
      depositCents: 200000,
      summary: "Two operators, dawn start, a 90-second recap. They did not proceed.",
    },
    notes: [{ body: "Leave it lost. Don’t follow up unless they write first." }],
  },
]

async function ensureDevStudio() {
  const byEmail = await db.query.users.findFirst({ where: eq(users.email, DEV_USER_EMAIL) })
  if (byEmail && byEmail.id !== DEV_USER_ID) {
    const canonical = await db.query.users.findFirst({ where: eq(users.id, DEV_USER_ID) })
    if (!canonical) {
      await db.insert(users).values({
        id: DEV_USER_ID,
        email: `${DEV_USER_ID}@rehome.fieldstudio.test`,
        name: DEV_USER_NAME,
      })
    }
    await db.update(jobs).set({ userId: DEV_USER_ID }).where(eq(jobs.userId, byEmail.id))
    await db.update(accounts).set({ userId: DEV_USER_ID }).where(eq(accounts.userId, byEmail.id))
    await db.delete(users).where(eq(users.id, byEmail.id))
    await db
      .update(users)
      .set({ email: DEV_USER_EMAIL, name: DEV_USER_NAME })
      .where(eq(users.id, DEV_USER_ID))
    return
  }

  await db
    .insert(users)
    .values({ id: DEV_USER_ID, email: DEV_USER_EMAIL, name: DEV_USER_NAME })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: DEV_USER_NAME },
    })
}

async function main() {
  await ensureDevStudio()

  for (const kit of KITS) {
    await db
      .insert(packingTemplates)
      .values({ id: kit.id, slug: kit.slug, name: kit.name, craft: kit.craft })
      .onConflictDoUpdate({
        target: packingTemplates.slug,
        set: { name: kit.name, craft: kit.craft },
      })
    await db.delete(packingTemplateItems).where(eq(packingTemplateItems.templateId, kit.id))
    await db.insert(packingTemplateItems).values(
      kit.items.map((label, index) => ({
        id: crypto.randomUUID(),
        templateId: kit.id,
        label,
        sortOrder: index,
      })),
    )
  }

  await db.delete(jobs).where(eq(jobs.userId, DEV_USER_ID))

  for (const job of SEED) {
    await db.insert(jobs).values({
      id: job.id,
      userId: DEV_USER_ID,
      clientName: job.clientName,
      clientEmail: job.clientEmail,
      title: job.title,
      craft: job.craft,
      status: job.status,
      shootDate: job.shootDate,
      deliveryDue: job.deliveryDue,
      footageHours: job.footageHours,
      revisionRounds: job.revisionRounds ?? 2,
      changeOrder: job.changeOrder ?? false,
      lostReason: job.lostReason,
    })
    if (job.quote) {
      await db.insert(quotes).values({
        id: crypto.randomUUID(),
        jobId: job.id,
        amountCents: job.quote.amountCents,
        depositCents: job.quote.depositCents,
        summary: job.quote.summary,
        depositReceivedAt: job.quote.depositReceivedAt
          ? new Date(job.quote.depositReceivedAt)
          : null,
      })
    }
    if (job.notes?.length) {
      await db.insert(notes).values(
        job.notes.map((note) => ({
          id: crypto.randomUUID(),
          jobId: job.id,
          body: note.body,
          pinned: note.pinned ?? false,
        })),
      )
    }
    if (job.reminders?.length) {
      await db.insert(reminders).values(
        job.reminders.map((reminder) => ({
          id: crypto.randomUUID(),
          jobId: job.id,
          body: reminder.body,
          dueAt: new Date(`${reminder.dueOn}T12:00:00.000Z`),
        })),
      )
    }
    if (job.packing?.length) {
      await db.insert(packingItems).values(
        job.packing.map((item, index) => ({
          id: crypto.randomUUID(),
          jobId: job.id,
          label: item.label,
          checked: item.checked ?? false,
          sortOrder: index,
        })),
      )
    }
    if (job.status === "booked" || job.status === "in_progress" || job.status === "delivered" || job.status === "paid") {
      await ensureFolders(DEV_USER_ID, job.id)
      await syncCalendar(DEV_USER_ID, job.id)
    }
  }

  console.log(`Seeded ${SEED.length} jobs for ${DEV_USER_NAME}.`)
}

main()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error(error)
    await closeDb()
    process.exit(1)
  })
