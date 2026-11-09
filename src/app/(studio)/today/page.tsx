import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { CallSheet } from "@/components/call-sheet"
import { buildCallSheet } from "@/lib/call-sheet"
import { todayKey } from "@/lib/pipeline"
import { listCallSheet } from "@/lib/queries"

export const metadata = { title: "Today" }

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const today = todayKey()
  const jobs = await listCallSheet(session.user.id)
  const tasks = buildCallSheet(jobs, today)
  return <CallSheet tasks={tasks} today={today} />
}
