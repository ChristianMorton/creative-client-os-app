import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { JobsBrowser } from "@/components/jobs-browser"
import { JOB_STATUSES, type JobStatus } from "@/lib/pipeline"
import { listJobs } from "@/lib/queries"

export const metadata = { title: "Jobs" }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const { status } = await searchParams
  const filter = JOB_STATUSES.find((item) => item === status) as JobStatus | undefined
  const jobs = await listJobs(session.user.id)

  return <JobsBrowser jobs={jobs} initialStatus={filter ?? "all"} />
}
