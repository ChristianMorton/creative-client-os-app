import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import {
  createDropboxTree,
  dropboxConfigured,
  dropboxStatus,
  resetDropboxTokenCache,
  type DropboxFetch,
} from "./dropbox"

describe("dropbox adapter", () => {
  const previous = {
    access: process.env.DROPBOX_ACCESS_TOKEN,
    key: process.env.DROPBOX_APP_KEY,
    secret: process.env.DROPBOX_APP_SECRET,
    refresh: process.env.DROPBOX_REFRESH_TOKEN,
  }

  afterEach(() => {
    restore("DROPBOX_ACCESS_TOKEN", previous.access)
    restore("DROPBOX_APP_KEY", previous.key)
    restore("DROPBOX_APP_SECRET", previous.secret)
    restore("DROPBOX_REFRESH_TOKEN", previous.refresh)
    resetDropboxTokenCache()
  })

  it("stays unconfigured when no token is set", () => {
    delete process.env.DROPBOX_ACCESS_TOKEN
    delete process.env.DROPBOX_APP_KEY
    delete process.env.DROPBOX_APP_SECRET
    delete process.env.DROPBOX_REFRESH_TOKEN
    assert.equal(dropboxConfigured(), false)
    const status = dropboxStatus()
    assert.equal(status.configured, false)
    assert.match(status.message ?? "", /isn’t connected/)
  })

  it("reuses a folder that already exists", async () => {
    const calls: string[] = []
    const fetchImpl: DropboxFetch = async (input, init) => {
      const url = String(input)
      const body = JSON.parse(String(init?.body)) as { path: string }
      calls.push(`${url.split("/").pop()} ${body.path}`)
      if (url.endsWith("create_folder_v2") && body.path === "/Atelier") {
        return json(
          {
            error: {
              ".tag": "path",
              path: { ".tag": "conflict", conflict: { ".tag": "folder" } },
            },
          },
          409,
        )
      }
      if (url.endsWith("get_metadata")) {
        return json({ id: `id:${body.path}`, path_display: body.path, name: "Atelier" }, 200)
      }
      return json(
        {
          metadata: {
            id: `id:${body.path}`,
            path_display: body.path,
            name: body.path.split("/").pop(),
          },
        },
        200,
      )
    }

    const drafts = await createDropboxTree("token", "Atelier", "Lookbook", fetchImpl)
    assert.deepEqual(
      drafts.map((folder) => folder.path),
      [
        "/Atelier/Lookbook",
        "/Atelier/Lookbook/01-admin",
        "/Atelier/Lookbook/02-raw",
        "/Atelier/Lookbook/03-exports",
        "/Atelier/Lookbook/04-client-delivery",
      ],
    )
    assert.ok(drafts.every((folder) => !folder.stubbed))
    assert.equal(
      drafts[4].url,
      "https://www.dropbox.com/home/Atelier/Lookbook/04-client-delivery",
    )
    assert.ok(calls.includes("get_metadata /Atelier"))
  })
})

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}
