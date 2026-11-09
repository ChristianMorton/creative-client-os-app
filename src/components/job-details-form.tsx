"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { updateJobAction } from "@/lib/actions"
import type { Craft } from "@/lib/pipeline"
import { Section } from "@/components/section"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Details = {
  id: string
  clientName: string
  clientEmail: string | null
  title: string
  craft: Craft
  shootDate: string | null
  deliveryDue: string | null
  footageHours: number | null
  revisionRounds: number
  changeOrder: boolean
}

export function JobDetailsForm({ job }: { job: Details }) {
  const [craft, setCraft] = useState<Craft>(job.craft)
  const [changeOrder, setChangeOrder] = useState(job.changeOrder)
  const [, start] = useTransition()

  function save(patch: Parameters<typeof updateJobAction>[1]) {
    start(async () => {
      const result = await updateJobAction(job.id, patch)
      if (!result.ok) toast.error(result.error)
    })
  }

  return (
    <Section title="Details">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Field label="Client">
          <Input
            defaultValue={job.clientName}
            onBlur={(event) => {
              if (event.target.value !== job.clientName) save({ clientName: event.target.value })
            }}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            defaultValue={job.clientEmail ?? ""}
            onBlur={(event) => {
              if (event.target.value !== (job.clientEmail ?? "")) {
                save({ clientEmail: event.target.value })
              }
            }}
          />
        </Field>
        <Field label="Title" className="sm:col-span-2">
          <Input
            defaultValue={job.title}
            onBlur={(event) => {
              if (event.target.value !== job.title) save({ title: event.target.value })
            }}
          />
        </Field>
        <Field label="Craft">
          <Select
            value={craft}
            onValueChange={(value) => {
              if (value !== "photographer" && value !== "cinematographer" && value !== "editor") return
              setCraft(value)
              if (value !== job.craft) save({ craft: value })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photographer">Photographer</SelectItem>
              <SelectItem value="cinematographer">Cinematographer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Revision rounds">
          <Input
            type="number"
            min={0}
            max={99}
            defaultValue={job.revisionRounds}
            onBlur={(event) => {
              const value = Number(event.target.value)
              if (value !== job.revisionRounds) save({ revisionRounds: value })
            }}
          />
        </Field>
        <Field label="Shoot">
          <Input
            type="date"
            defaultValue={job.shootDate ?? ""}
            onBlur={(event) => {
              const value = event.target.value || null
              if (value !== job.shootDate) save({ shootDate: value })
            }}
          />
        </Field>
        <Field label="Delivery due">
          <Input
            type="date"
            defaultValue={job.deliveryDue ?? ""}
            onBlur={(event) => {
              const value = event.target.value || null
              if (value !== job.deliveryDue) save({ deliveryDue: value })
            }}
          />
        </Field>
        <Field label="Footage hours">
          <Input
            type="number"
            min={0}
            step="0.5"
            placeholder="Estimate"
            defaultValue={job.footageHours ?? ""}
            onBlur={(event) => {
              const raw = event.target.value.trim()
              const value = raw === "" ? null : Number(raw)
              if (value !== job.footageHours) save({ footageHours: value })
            }}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2.5 text-sm sm:mt-5">
          <Checkbox
            checked={changeOrder}
            onCheckedChange={(checked) => {
              const next = checked === true
              setChangeOrder(next)
              save({ changeOrder: next })
            }}
          />
          Change order
        </label>
      </div>
    </Section>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ? `grid min-w-0 gap-1.5 ${className}` : "grid min-w-0 gap-1.5"}>
      <Label className="px-2 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
