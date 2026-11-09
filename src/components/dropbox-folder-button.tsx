"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { createDropboxFoldersAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"

export function DropboxFolderButton({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const result = await createDropboxFoldersAction(jobId)
          if (!result.ok) toast.error(result.error)
        })
      }}
    >
      {pending ? "Creating…" : "Add Dropbox folders"}
    </Button>
  )
}
