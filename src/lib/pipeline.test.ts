import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canTransition,
  deliveryUnlocked,
  folderPlan,
  nextDay,
  nextStatus,
} from "./pipeline"

describe("pipeline", () => {
  it("walks a lead to paid and blocks skips", () => {
    assert.equal(canTransition("new", "contacted"), true)
    assert.equal(canTransition("new", "booked"), false)
    assert.equal(canTransition("quoted", "booked"), true)
    assert.equal(canTransition("quoted", "lost"), true)
    assert.equal(canTransition("booked", "lost"), false)
    assert.equal(canTransition("delivered", "paid"), true)
    assert.equal(canTransition("paid", "delivered"), false)
    assert.equal(nextStatus("quoted"), "booked")
    assert.equal(nextStatus("paid"), null)
  })

  it("locks delivery until paid or a trusted override", () => {
    assert.equal(deliveryUnlocked({ status: "delivered", trustedClient: false }), false)
    assert.equal(deliveryUnlocked({ status: "delivered", trustedClient: true }), true)
    assert.equal(deliveryUnlocked({ status: "paid", trustedClient: false }), true)
    assert.equal(deliveryUnlocked({ status: "booked", trustedClient: false }), false)
  })

  it("builds the booked folder tree", () => {
    const plan = folderPlan("Hale & Co.", "Ceramic line, product film")
    assert.deepEqual(
      plan.folders.map((folder) => folder.path),
      [
        "/Hale & Co./Ceramic line, product film",
        "/Hale & Co./Ceramic line, product film/01-admin",
        "/Hale & Co./Ceramic line, product film/02-raw",
        "/Hale & Co./Ceramic line, product film/03-exports",
        "/Hale & Co./Ceramic line, product film/04-client-delivery",
      ],
    )
    assert.equal(nextDay("2026-10-04"), "2026-10-05")
  })
})
