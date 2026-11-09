"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addNoteAction, deleteNoteAction, setNotePinnedAction } from "@/lib/actions"
import { formatStamp } from "@/lib/format"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function NotesPanel({
  jobId,
  notes,
}: {
  jobId: string
  notes: { id: string; body: string; pinned: boolean; createdAt: string }[]
}) {
  const [body, setBody] = useState("")
  const [pending, start] = useTransition()

  function add() {
    const text = body.trim()
    if (!text) return
    start(async () => {
      const result = await addNoteAction(jobId, text)
      if (!result.ok) toast.error(result.error)
      else setBody("")
    })
  }

  return (
    <Section title="Notes">
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Jot down call notes, references, or the client&apos;s vibe.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border-l-2 border-foreground/25 pl-3"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatStamp(note.createdAt)}</span>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => {
                    start(async () => {
                      const result = await setNotePinnedAction(jobId, note.id, !note.pinned)
                      if (!result.ok) toast.error(result.error)
                    })
                  }}
                >
                  {note.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => {
                    start(async () => {
                      const result = await deleteNoteAction(jobId, note.id)
                      if (!result.ok) toast.error(result.error)
                    })
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 grid gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="A pinned note stays at the top."
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) add()
          }}
        />
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={add} disabled={pending || !body.trim()}>
            Add note
          </Button>
        </div>
      </div>
    </Section>
  )
}
