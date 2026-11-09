import { auth } from "@/auth"
import { FollowUps } from "@/components/follow-ups"
import { PipelineBoard } from "@/components/pipeline-board"
import { addDaysKey } from "@/lib/pipeline"
import { listFollowUps, listJobs } from "@/lib/queries"
import { redirect } from "next/navigation"

export const metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const [jobs, followUps] = await Promise.all([
    listJobs(session.user.id),
    listFollowUps(session.user.id),
  ])
  const soon = addDaysKey(3)
  const attention = followUps.filter(
    (item) => item.dueOn <= soon && item.status !== "paid" && item.status !== "lost",
  )

  return (
    <div className="safelight min-h-full">
      <FollowUps items={attention} />
      <PipelineBoard jobs={jobs} />
    </div>
  )
}
