import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core"
import {
  CALENDAR_KINDS,
  CRAFTS,
  FOLDER_KINDS,
  JOB_STATUSES,
} from "@/lib/pipeline"

export const jobStatus = pgEnum("job_status", JOB_STATUSES)
export const craft = pgEnum("craft", CRAFTS)
export const folderProvider = pgEnum("folder_provider", ["google_drive", "dropbox"])
export const folderKind = pgEnum("folder_kind", FOLDER_KINDS)
export const calendarKind = pgEnum("calendar_kind", CALENDAR_KINDS)

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at"),
    scope: text("scope"),
  },
  (table) => [
    uniqueIndex("accounts_provider_account").on(table.provider, table.providerAccountId),
  ],
)

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email"),
    title: text("title").notNull(),
    craft: craft("craft").notNull(),
    status: jobStatus("status").notNull().default("new"),
    shootDate: date("shoot_date", { mode: "string" }),
    deliveryDue: date("delivery_due", { mode: "string" }),
    footageHours: real("footage_hours"),
    revisionRounds: integer("revision_rounds").notNull().default(2),
    changeOrder: boolean("change_order").notNull().default(false),
    trustedClient: boolean("trusted_client").notNull().default(false),
    lostReason: text("lost_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("jobs_user_status").on(table.userId, table.status)],
)

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .unique()
    .references(() => jobs.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  depositCents: integer("deposit_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  summary: text("summary"),
  depositReceivedAt: timestamp("deposit_received_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const reminders = pgTable("reminders", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const packingTemplates = pgTable("packing_templates", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  craft: craft("craft").notNull(),
})

export const packingTemplateItems = pgTable("packing_template_items", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => packingTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
})

export const packingItems = pgTable("packing_items", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  checked: boolean("checked").notNull().default(false),
  sortOrder: integer("sort_order").notNull(),
})

export const folders = pgTable(
  "folders",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    provider: folderProvider("provider").notNull(),
    kind: folderKind("kind").notNull(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    externalId: text("external_id"),
    url: text("url"),
    stubbed: boolean("stubbed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("folders_job_provider_kind").on(table.jobId, table.provider, table.kind),
  ],
)

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    kind: calendarKind("kind").notNull(),
    title: text("title").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    externalId: text("external_id"),
    htmlLink: text("html_link"),
    stubbed: boolean("stubbed").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("calendar_events_job_kind").on(table.jobId, table.kind)],
)

export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
  accounts: many(accounts),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(users, { fields: [jobs.userId], references: [users.id] }),
  quote: one(quotes, { fields: [jobs.id], references: [quotes.jobId] }),
  notes: many(notes),
  reminders: many(reminders),
  packingItems: many(packingItems),
  folders: many(folders),
  calendarEvents: many(calendarEvents),
}))

export const notesRelations = relations(notes, ({ one }) => ({
  job: one(jobs, { fields: [notes.jobId], references: [jobs.id] }),
}))

export const quotesRelations = relations(quotes, ({ one }) => ({
  job: one(jobs, { fields: [quotes.jobId], references: [jobs.id] }),
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  job: one(jobs, { fields: [reminders.jobId], references: [jobs.id] }),
}))

export const packingTemplatesRelations = relations(packingTemplates, ({ many }) => ({
  items: many(packingTemplateItems),
}))

export const packingTemplateItemsRelations = relations(packingTemplateItems, ({ one }) => ({
  template: one(packingTemplates, {
    fields: [packingTemplateItems.templateId],
    references: [packingTemplates.id],
  }),
}))

export const packingItemsRelations = relations(packingItems, ({ one }) => ({
  job: one(jobs, { fields: [packingItems.jobId], references: [jobs.id] }),
}))

export const foldersRelations = relations(folders, ({ one }) => ({
  job: one(jobs, { fields: [folders.jobId], references: [jobs.id] }),
}))

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  job: one(jobs, { fields: [calendarEvents.jobId], references: [jobs.id] }),
}))
