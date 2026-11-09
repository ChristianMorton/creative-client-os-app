export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="animate-rise rounded-sm border border-border bg-card p-6 paper-shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
