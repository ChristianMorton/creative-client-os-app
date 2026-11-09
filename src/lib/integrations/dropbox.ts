import { folderPlan, type FolderKind } from "@/lib/pipeline"
import type { FolderDraft } from "@/lib/integrations/drive"

const FOLDER_ENDPOINT = "https://api.dropboxapi.com/2/files"
const TOKEN_ENDPOINT = "https://api.dropbox.com/oauth2/token"

type DropboxMetadata = {
  id?: string
  path_display?: string
  name?: string
}

type DropboxError = {
  error?: {
    ".tag"?: string
    path?: { ".tag"?: string; conflict?: { ".tag"?: string } }
  }
}

export type DropboxFetch = (input: string, init?: RequestInit) => Promise<Response>

let cachedToken: { value: string; expiresAt: number } | null = null

export function dropboxConfigured() {
  if (process.env.DROPBOX_ACCESS_TOKEN?.trim()) return true
  return Boolean(
    process.env.DROPBOX_APP_KEY?.trim() &&
      process.env.DROPBOX_APP_SECRET?.trim() &&
      process.env.DROPBOX_REFRESH_TOKEN?.trim(),
  )
}

export function dropboxStatus() {
  if (!dropboxConfigured()) {
    return {
      configured: false as const,
      message: "Dropbox isn’t connected. Job folders are created in Google Drive.",
    }
  }
  return { configured: true as const, message: null }
}

export function resetDropboxTokenCache() {
  cachedToken = null
}

export async function dropboxAccessToken(fetchImpl: DropboxFetch = fetch) {
  const direct = process.env.DROPBOX_ACCESS_TOKEN?.trim()
  const refresh = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const key = process.env.DROPBOX_APP_KEY?.trim()
  const secret = process.env.DROPBOX_APP_SECRET?.trim()
  if (refresh && key && secret) {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: key,
      client_secret: secret,
    })
    const response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const payload = (await response.json().catch(() => null)) as {
      access_token?: string
      expires_in?: number
    } | null
    if (!response.ok || !payload?.access_token) {
      throw new Error("Dropbox did not refresh an access token")
    }
    const expiresIn = payload.expires_in ?? 3600
    cachedToken = { value: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 }
    return payload.access_token
  }
  if (direct) return direct
  throw new Error("Dropbox isn’t connected")
}

function homeUrl(pathDisplay: string) {
  const encoded = pathDisplay
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `https://www.dropbox.com/home${encoded}`
}

function isFolderConflict(payload: DropboxError | null) {
  return (
    payload?.error?.[".tag"] === "path" &&
    payload.error.path?.[".tag"] === "conflict" &&
    payload.error.path.conflict?.[".tag"] === "folder"
  )
}

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as (DropboxMetadata & DropboxError & {
    metadata?: DropboxMetadata
  }) | null
}

async function ensureFolder(token: string, path: string, fetchImpl: DropboxFetch) {
  const created = await fetchImpl(`${FOLDER_ENDPOINT}/create_folder_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, autorename: false }),
  })
  const createdBody = await readJson(created)
  if (created.ok && createdBody?.metadata?.id && createdBody.metadata.path_display) {
    return createdBody.metadata
  }
  if (created.status === 409 && isFolderConflict(createdBody)) {
    const existing = await fetchImpl(`${FOLDER_ENDPOINT}/get_metadata`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path }),
    })
    const metadata = await readJson(existing)
    if (existing.ok && metadata?.id && metadata.path_display) return metadata
  }
  throw new Error(`Dropbox could not create ${path}`)
}

export async function createDropboxTree(
  token: string,
  clientName: string,
  jobTitle: string,
  fetchImpl: DropboxFetch = fetch,
): Promise<FolderDraft[]> {
  const plan = folderPlan(clientName, jobTitle)
  await ensureFolder(token, `/${plan.client}`, fetchImpl)
  const drafts: FolderDraft[] = []
  for (const folder of plan.folders) {
    const metadata = await ensureFolder(token, folder.path, fetchImpl)
    drafts.push(draftFrom(folder.kind, folder.name, metadata))
  }
  return drafts
}

function draftFrom(
  kind: FolderKind,
  name: string,
  metadata: DropboxMetadata,
): FolderDraft {
  const path = metadata.path_display ?? ""
  if (!metadata.id || !path) throw new Error("Dropbox did not return a folder id")
  return {
    kind,
    name,
    path,
    externalId: metadata.id,
    url: homeUrl(path),
    stubbed: false,
  }
}
