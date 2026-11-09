import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { StudioShell } from "@/components/studio-shell"

export const dynamic = "force-dynamic"

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  return <StudioShell user={{ name: session.user.name ?? "Studio" }}>{children}</StudioShell>
}
