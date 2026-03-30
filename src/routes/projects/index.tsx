import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { getUserProjects } from "@/features/project/firestore"
import type { Project } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/features/project/create-project-dialog"
import { PlusIcon, UsersIcon } from "lucide-react"

export const Route = createFileRoute("/projects/")({ component: ProjectsPage })

function ProjectsPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const unsubscribe = getUserProjects(user.uid, setProjects)
    return unsubscribe
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" })
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projets</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Nouveau projet
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="mb-4 text-muted-foreground">Vous n'avez pas encore de projet.</p>
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Nouveau projet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const role = user ? project.members[user.uid] : undefined
            const memberCount = Object.values(project.members).filter((r) => r != null).length
            return (
              <button
                key={project.id}
                className="text-left"
                onClick={() =>
                  navigate({ to: "/projects/$projectId", params: { projectId: project.id } })
                }
              >
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{project.name}</CardTitle>
                      {role && (
                        <Badge variant={role === "admin" ? "default" : "secondary"}>
                          {role === "admin" ? "Admin" : "Membre"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <UsersIcon className="size-4" />
                      <span>{memberCount} membre{memberCount > 1 ? "s" : ""}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </main>
  )
}
