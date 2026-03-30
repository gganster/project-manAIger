import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Settings2Icon } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getProject, getUser } from "@/features/project/firestore"
import { onProjectCards } from "@/features/board/firestore"
import type { Project, Card, AppUser } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/features/board/kanban-board"

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectBoardPage,
})

function ProjectBoardPage() {
  const { projectId } = Route.useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [members, setMembers] = useState<Record<string, string>>({})
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" })
      return
    }
    if (!user) return

    let unsubscribe: (() => void) | undefined

    getProject(projectId)
      .then(async (p) => {
        if (!p || !p.members[user.uid]) {
          navigate({ to: "/projects" })
          return
        }
        setProject(p)

        // Fetch member display names
        const memberUids = Object.keys(p.members)
        const userProfiles = await Promise.all(
          memberUids.map((uid) => getUser(uid))
        )
        const memberMap: Record<string, string> = {}
        userProfiles.forEach((profile: AppUser | null) => {
          if (profile) {
            memberMap[profile.uid] = profile.displayName
          }
        })
        setMembers(memberMap)

        // Subscribe to real-time cards
        unsubscribe = onProjectCards(projectId, (updatedCards) => {
          setCards(updatedCards)
        })
      })
      .finally(() => setFetching(false))

    return () => {
      unsubscribe?.()
    }
  }, [projectId, user, loading, navigate])

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    )
  }

  if (!project || !user) return null

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h1 className="text-base font-semibold">{project.name}</h1>
        <Button variant="ghost" size="icon-sm" asChild title="Paramètres du projet">
          <Link to="/projects/$projectId/settings" params={{ projectId }}>
            <Settings2Icon />
          </Link>
        </Button>
      </header>
      <main className="flex-1 overflow-auto px-4 py-4">
        <KanbanBoard
          cards={cards}
          projectId={projectId}
          userId={user.uid}
          members={members}
        />
      </main>
    </div>
  )
}
