import { google } from "googleapis"

type GoogleAuth = InstanceType<typeof google.auth.OAuth2>
import { nextDay, type CalendarKind } from "@/lib/pipeline"

export type EventDraft = {
  kind: CalendarKind
  title: string
  startsOn: string
  externalId: string
  htmlLink: string
  stubbed: boolean
}

export function mockEvent(
  jobId: string,
  kind: CalendarKind,
  title: string,
  startsOn: string,
): EventDraft {
  const externalId = `mock_${jobId}_${kind}`
  return {
    kind,
    title,
    startsOn,
    externalId,
    htmlLink: `https://calendar.google.com/calendar/event?eid=${externalId}`,
    stubbed: true,
  }
}

export async function upsertGoogleEvent(
  auth: GoogleAuth,
  input: {
    externalId?: string | null
    stubbed?: boolean
    title: string
    startsOn: string
    description: string
  },
): Promise<{ externalId: string; htmlLink: string }> {
  const calendar = google.calendar({ version: "v3", auth })
  const requestBody = {
    summary: input.title,
    description: input.description,
    start: { date: input.startsOn },
    end: { date: nextDay(input.startsOn) },
  }
  if (input.externalId && !input.stubbed) {
    const patched = await calendar.events.patch({
      calendarId: "primary",
      eventId: input.externalId,
      requestBody,
    })
    if (!patched.data.id) throw new Error("Calendar did not return an event id")
    return {
      externalId: patched.data.id,
      htmlLink: patched.data.htmlLink ?? "",
    }
  }
  const inserted = await calendar.events.insert({
    calendarId: "primary",
    requestBody,
  })
  if (!inserted.data.id) throw new Error("Calendar did not return an event id")
  return {
    externalId: inserted.data.id,
    htmlLink: inserted.data.htmlLink ?? "",
  }
}

export async function deleteGoogleEvent(auth: GoogleAuth, eventId: string) {
  const calendar = google.calendar({ version: "v3", auth })
  await calendar.events.delete({ calendarId: "primary", eventId })
}
