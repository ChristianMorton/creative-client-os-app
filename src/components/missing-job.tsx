import Link from "next/link"
import { Package } from "lucide-react"

export function MissingJob() {
  return (
    <div className="safelight flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-sm animate-rise text-center">
        <Package className="mx-auto h-8 w-8 text-foreground" />
        <h1 className="mt-4 font-serif text-4xl">Not on the desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This job may have been removed, or the link is off by a frame.
        </p>
        <Link
          href="/pipeline"
          className="mt-6 inline-flex rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to Pipeline
        </Link>
      </div>
    </div>
  )
}
