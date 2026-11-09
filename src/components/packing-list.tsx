"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  addPackingItemAction,
  copyPackingAction,
  loadPackingTemplateAction,
  removePackingItemAction,
  togglePackingItemAction,
} from "@/lib/actions"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Item = { id: string; label: string; checked: boolean }
type Kit = "photographer" | "cinematographer" | "copy"

export function PackingList({ jobId, items }: { jobId: string; items: Item[] }) {
  const signature = items.map((item) => `${item.id}:${item.checked}:${item.label}`).join("|")
  const [rows, setRows] = useState(items)
  const [synced, setSynced] = useState(signature)
  const [label, setLabel] = useState("")
  const [replace, setReplace] = useState<Kit | null>(null)
  const [pending, start] = useTransition()

  if (signature !== synced) {
    setSynced(signature)
    setRows(items)
  }

  const done = rows.filter((item) => item.checked).length

  function run(kit: Kit) {
    start(async () => {
      const result =
        kit === "copy"
          ? await copyPackingAction(jobId)
          : await loadPackingTemplateAction(jobId, kit)
      if (!result.ok) toast.error(result.error)
      setReplace(null)
    })
  }

  function ask(kit: Kit) {
    if (rows.length === 0) run(kit)
    else setReplace(kit)
  }

  return (
    <Section
      title="Packing"
      action={
        <span className="text-xs text-muted-foreground">
          {rows.length === 0 ? "Empty" : `${done}/${rows.length}`}
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => ask("photographer")}>
          Photographer kit
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => ask("cinematographer")}>
          Cinematographer kit
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => ask("copy")}>
          Copy from last job
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nothing packed yet. Load a kit, or add what this shoot actually needs.
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((item) => (
            <li key={item.id} className="flex min-h-12 items-center gap-3 py-1">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => {
                  const next = !item.checked
                  setRows((current) =>
                    current.map((row) => (row.id === item.id ? { ...row, checked: next } : row)),
                  )
                  start(async () => {
                    const result = await togglePackingItemAction(jobId, item.id)
                    if (!result.ok) {
                      toast.error(result.error)
                      setRows(items)
                    }
                  })
                }}
                aria-label={item.label}
              />
              <span className={item.checked ? "flex-1 text-base text-muted-foreground line-through sm:text-sm" : "flex-1 text-base sm:text-sm"}>
                {item.label}
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  start(async () => {
                    const result = await removePackingItemAction(jobId, item.id)
                    if (!result.ok) toast.error(result.error)
                  })
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const text = label.trim()
          if (!text) return
          start(async () => {
            const result = await addPackingItemAction(jobId, text)
            if (!result.ok) toast.error(result.error)
            else setLabel("")
          })
        }}
      >
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Add an item" />
        <Button type="submit" variant="secondary" size="sm" disabled={pending || !label.trim()}>
          Add
        </Button>
      </form>

      <Dialog open={replace !== null} onOpenChange={(open) => !open && setReplace(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Replace this list?</DialogTitle>
            <DialogDescription>
              The checks on this job will clear. The new list is a copy, not a link back to the kit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplace(null)}>
              Keep it
            </Button>
            <Button
              disabled={pending || !replace}
              onClick={() => {
                if (replace) run(replace)
              }}
            >
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}
