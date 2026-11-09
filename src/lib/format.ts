export function formatMoney(cents: number, currency = "USD") {
  const hasCents = cents % 100 !== 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(cents / 100)
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, "")
}

export function dollarsToCents(value: string) {
  const cleaned = value.replace(/[$,\s]/g, "")
  if (!cleaned) return null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

export function formatDay(isoDate: string | null | undefined) {
  if (!isoDate) return "Open"
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return "Open"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatStamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}
