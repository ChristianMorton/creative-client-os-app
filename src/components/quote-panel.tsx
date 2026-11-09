"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { saveQuoteAction, setDepositReceivedAction } from "@/lib/actions"
import { centsToInput, formatMoney, formatStamp } from "@/lib/format"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function QuotePanel({
  jobId,
  quote,
}: {
  jobId: string
  quote: {
    amountCents: number
    depositCents: number
    currency: string
    summary: string | null
    depositReceivedAt: string | null
  } | null
}) {
  const [amount, setAmount] = useState(quote ? centsToInput(quote.amountCents) : "")
  const [deposit, setDeposit] = useState(quote ? centsToInput(quote.depositCents) : "")
  const [summary, setSummary] = useState(quote?.summary ?? "")
  const [pending, start] = useTransition()

  function save() {
    start(async () => {
      const result = await saveQuoteAction(jobId, { amount, deposit, summary })
      if (!result.ok) toast.error(result.error)
    })
  }

  function markDeposit(received: boolean) {
    start(async () => {
      const result = await setDepositReceivedAction(jobId, received)
      if (!result.ok) toast.error(result.error)
    })
  }

  return (
    <Section
      title="Quote"
      action={
        <Button variant="ghost" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save quote"}
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-[13px] font-medium text-muted-foreground">Amount</Label>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="4800"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-[13px] font-medium text-muted-foreground">Deposit</Label>
          <Input
            inputMode="decimal"
            value={deposit}
            onChange={(event) => setDeposit(event.target.value)}
            placeholder="1600"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label className="text-[13px] font-medium text-muted-foreground">Summary</Label>
          <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What the fee covers." />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {quote?.depositReceivedAt ? (
          <>
            <span className="text-muted-foreground">
              Deposit received {formatStamp(quote.depositReceivedAt)}
              {quote.depositCents > 0 ? ` · ${formatMoney(quote.depositCents, quote.currency)}` : ""}
            </span>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => markDeposit(false)}>
              Clear receipt
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" disabled={pending || !quote} onClick={() => markDeposit(true)}>
            Mark deposit received
          </Button>
        )}
        {!quote ? (
          <span className="text-xs text-muted-foreground">Save the quote before marking the deposit.</span>
        ) : null}
      </div>
    </Section>
  )
}
