import { auth } from "@/auth"
import { MissingJob } from "@/components/missing-job"
import { StudioShell } from "@/components/studio-shell"

export default async function NotFound() {
  const session = await auth()
  if (session?.user?.id) {
    return (
      <StudioShell user={{ name: session.user.name ?? "Studio" }}>
        <MissingJob />
      </StudioShell>
    )
  }
  return <MissingJob />
}
