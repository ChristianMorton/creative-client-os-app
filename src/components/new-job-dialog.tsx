"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createJobAction } from "@/lib/actions"
import { CRAFTS, craftShort, type Craft } from "@/lib/pipeline"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "cn"

export function NewJobDialog() {
  const [open, setOpen] = useState(false)
  const [craft, setCraft] = useState<Craft>("photographer")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(formData: FormData) {
    setError(null)
    start(async () => {
      const result = await createJobAction({
        clientName: String(formData.get("clientName") ?? ""),
        clientEmail: String(formData.get("clientEmail") ?? ""),
        title: String(formData.get("title") ?? ""),
        craft,
        shootDate: String(formData.get("shootDate") ?? ""),
        deliveryDue: String(formData.get("deliveryDue") ?? ""),
      })
      if (result && !result.ok) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  const field = "h-9 rounded-sm border-input bg-background px-3"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-foreground px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest transition hover:bg-foreground hover:text-background">
        <Plus className="h-3.5 w-3.5" /> New job
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">New job</DialogTitle>
        </DialogHeader>
        <form action={submit} className="grid gap-3">
          <Field label="Client" name="clientName" required placeholder="Client" className={field} />
          <Field label="Title" name="title" required placeholder="Job title" className={field} />
          <div className="flex gap-2">
            {CRAFTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCraft(item)}
                className={cn(
                  "flex-1 rounded-sm border px-3 py-2 text-sm",
                  craft === item ? "border-foreground text-foreground" : "border-input text-muted-foreground",
                )}
              >
                {craftShort(item)}
              </button>
            ))}
          </div>
          <Field label="Email" name="clientEmail" type="email" placeholder="Optional" className={field} />
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <Field label="Shoot date" name="shootDate" type="date" className={field} />
            <Field label="Delivery due" name="deliveryDue" type="date" className={field} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="mt-1 border-0 bg-transparent p-0 sm:justify-stretch">
            <Button type="submit" disabled={pending} className="h-9 w-full rounded-sm">
              {pending ? "Creating…" : "Add to desk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  className,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} className={className} />
    </div>
  )
}
