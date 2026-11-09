import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEV_USER_EMAIL, DEV_USER_ID } from "./constants"
import { resolveStudioUserId } from "./dev-session"

describe("dev studio session", () => {
  it("pins seeded jobs to the studio id even when the token sub drifted", () => {
    assert.equal(
      resolveStudioUserId({
        email: DEV_USER_EMAIL,
        provider: "credentials",
        tokenSub: "not-the-seed-user",
      }),
      DEV_USER_ID,
    )
    assert.equal(
      resolveStudioUserId({ provider: "dev", userId: "authjs-generated" }),
      DEV_USER_ID,
    )
    assert.equal(
      resolveStudioUserId({ email: "someone@studio.test", userId: "google-row", tokenSub: "old" }),
      "google-row",
    )
  })
})

// Auth provider availability is separate from resolving existing studio sessions.
describe("development authentication boundary", () => {
  it("disables passwordless studio authentication in production", async () => {
    const { devAuthEnabled } = await import("./env")
    const previous = { ...process.env }
    try {
      Object.assign(process.env, { NODE_ENV: "production", AUTH_DEV_MODE: "true" })
      delete process.env.AUTH_GOOGLE_ID
      delete process.env.AUTH_GOOGLE_SECRET
      assert.equal(devAuthEnabled(), false)
      Object.assign(process.env, { NODE_ENV: "development", AUTH_DEV_MODE: "false" })
      assert.equal(devAuthEnabled(), true)
      Object.assign(process.env, { AUTH_GOOGLE_ID: "example", AUTH_GOOGLE_SECRET: "example" })
      assert.equal(devAuthEnabled(), false)
      process.env.AUTH_DEV_MODE = "true"
      assert.equal(devAuthEnabled(), true)
    } finally {
      for (const key of ["NODE_ENV", "AUTH_DEV_MODE", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"]) {
        if (previous[key] === undefined) delete process.env[key]
        else process.env[key] = previous[key]
      }
    }
  })
})
