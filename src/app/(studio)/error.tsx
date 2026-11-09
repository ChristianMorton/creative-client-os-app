"use client"

export default function StudioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="safelight flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-sm animate-rise text-center">
        <h1 className="font-serif text-4xl">The desk didn’t load.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Postgres may be down, or the last read failed. Jobs already saved are still in the database.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
