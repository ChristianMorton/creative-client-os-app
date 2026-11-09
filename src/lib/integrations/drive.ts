import { google } from "googleapis"

type GoogleAuth = InstanceType<typeof google.auth.OAuth2>
import { folderPlan, type FolderKind } from "@/lib/pipeline"

export type FolderDraft = {
  kind: FolderKind
  name: string
  path: string
  externalId: string
  url: string
  stubbed: boolean
}

function escapeQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function folderUrl(id: string) {
  return `https://drive.google.com/drive/folders/${id}`
}

export function mockFolders(jobId: string, clientName: string, jobTitle: string): FolderDraft[] {
  return folderPlan(clientName, jobTitle).folders.map((folder) => ({
    kind: folder.kind,
    name: folder.name,
    path: folder.path,
    externalId: `mock_${jobId}_${folder.kind}`,
    url: folderUrl(`mock_${jobId}_${folder.kind}`),
    stubbed: true,
  }))
}

async function findFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string,
) {
  const parent = parentId ? ` and '${parentId}' in parents` : ""
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapeQuery(name)}' and trashed = false${parent}`
  const listed = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 1,
    spaces: "drive",
  })
  return listed.data.files?.[0]?.id ?? null
}

async function ensureFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string,
) {
  const existing = await findFolder(drive, name, parentId)
  if (existing) return existing
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  })
  if (!created.data.id) throw new Error("Drive did not return a folder id")
  return created.data.id
}

export async function createDriveTree(
  auth: GoogleAuth,
  clientName: string,
  jobTitle: string,
): Promise<FolderDraft[]> {
  const drive = google.drive({ version: "v3", auth })
  const plan = folderPlan(clientName, jobTitle)
  const clientId = await ensureFolder(drive, plan.client)
  const jobId = await ensureFolder(drive, plan.job, clientId)
  const drafts: FolderDraft[] = [
    {
      kind: "root",
      name: plan.job,
      path: plan.folders[0].path,
      externalId: jobId,
      url: folderUrl(jobId),
      stubbed: false,
    },
  ]
  for (const folder of plan.folders.slice(1)) {
    const id = await ensureFolder(drive, folder.name, jobId)
    drafts.push({
      kind: folder.kind,
      name: folder.name,
      path: folder.path,
      externalId: id,
      url: folderUrl(id),
      stubbed: false,
    })
  }
  return drafts
}
