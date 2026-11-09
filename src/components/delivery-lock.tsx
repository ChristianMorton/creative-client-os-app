"use client"

import { useState, useTransition } from "react"
import { Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { setTrustedClientAction } from "@/lib/actions"
import { deliveryUnlocked, type JobStatus } from "@/lib/pipeline"
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
import { Label } from "@/components/ui/label"

export function DeliveryLock({
  jobId,
  clientName,
  status,
  trustedClient,
}: {
  jobId: string
  clientName: string
  status: JobStatus
  trustedClient: boolean
}) {
  const unlocked = deliveryUnlocked({ status, trustedClient })
  const [open, setOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [ack, setAck] = useState(false)
  const [pending, start] = useTransition()
  const nameMatches = typed.trim().toLowerCase() === clientName.trim().toLowerCase()

  if (status === "paid") {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Unlock className="h-4 w-4" />
        Paid, link released
      </div>
    )
  }

  if (trustedClient && unlocked) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Unlock className="h-4 w-4" />
          Unlocked by you (trusted)
        </div>
        <button
          type="button"
          onClick={() => setLockOpen(true)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Lock again
        </button>
        <Dialog open={lockOpen} onOpenChange={setLockOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">Lock delivery again?</DialogTitle>
              <DialogDescription>
                The client link hides until this job is marked paid.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLockOpen(false)}>
                Leave open
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    const result = await setTrustedClientAction(jobId, false)
                    if (!result.ok) toast.error(result.error)
                    else setLockOpen(false)
                  })
                }}
              >
                Lock until paid
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-3 rounded-sm border border-dashed border-border p-4">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm">Locked until paid</div>
            <div className="text-xs text-muted-foreground">
              The delivery link stays hidden until this job is marked Paid.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Trusted unlock…
        </button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setTyped("")
            setAck(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Unlock before payment?</DialogTitle>
            <DialogDescription>
              This shares the client delivery link before payment. It is not the next step on the job.
              Type {clientName} to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-muted-foreground">
                Client name
              </Label>
              <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
            </div>
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox className="mt-0.5" checked={ack} onCheckedChange={(checked) => setAck(checked === true)} />
              I am unlocking delivery before payment for a trusted client.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep locked
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !nameMatches || !ack}
              onClick={() => {
                start(async () => {
                  const result = await setTrustedClientAction(jobId, true, typed, ack)
                  if (!result.ok) toast.error(result.error)
                  else setOpen(false)
                })
              }}
            >
              Unlock delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
