import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildCallSheet } from "./call-sheet"
import type { CallSheetJob } from "./queries"

const today = "2026-10-03"

function job(patch: Partial<CallSheetJob> & Pick<CallSheetJob, "id" | "status">): CallSheetJob {
  return {
    clientName: "Juniper",
    title: "Spring film",
    craft: "cinematographer",
    shootDate: null,
    deliveryDue: null,
    depositReceived: false,
    packing: [],
    reminders: [],
    ...patch,
  }
}

describe("call sheet", () => {
  it("sorts a shoot, an edit, and a desk chase onto the right lanes", () => {
    const tasks = buildCallSheet(
      [
        job({
          id: "shoot",
          status: "booked",
          shootDate: today,
          packing: [{ checked: false }, { checked: true }],
        }),
        job({
          id: "edit",
          status: "in_progress",
          clientName: "North",
          deliveryDue: "2026-10-04",
        }),
        job({
          id: "paid",
          status: "paid",
          clientName: "Done",
        }),
        job({
          id: "lead",
          status: "quoted",
          clientName: "Harbor",
          reminders: [{ id: "r1", body: "Nudge", dueOn: today, done: false }],
        }),
      ],
      today,
    )

    assert.deepEqual(
      tasks.map((task) => [task.lane, task.taskTitle, task.when]),
      [
        ["desk", "Nudge on the quote", today],
        ["shoot", "Shoot day", today],
        ["desk", "Confirm the deposit", today],
        ["edit", "Finish & export", "2026-10-04"],
      ],
    )
    const shoot = tasks.find((task) => task.lane === "shoot")
    const quote = tasks.find((task) => task.taskTitle === "Nudge on the quote")
    assert.equal(shoot?.advance, "Wrap shoot · start edit")
    assert.equal(shoot?.detail, "1 of 2 items still to pack")
    assert.equal(quote?.advance, "Booked")
    assert.equal(tasks.some((task) => task.clientName === "Done"), false)
  })
})
