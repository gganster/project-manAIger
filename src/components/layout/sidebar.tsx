import { useEffect, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { FolderKanban, Settings, Plus, PanelLeftClose, PanelLeft } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getUserProjects } from "@/features/project/firestore"
import type { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CreateProjectDialog } from "@/features/project/create-project-dialog"
import { cn } from "@/lib/utils"

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!user) return
    const unsubscribe = getUserProjects(user.uid, (p) => setProjects(p))
    return unsubscribe
  }, [user])

  function getActiveProjectId(): string | null {
    const match = pathname.match(/^\/projects\/([^/]+)/)
    return match ? match[1] : null
  }

  const activeProjectId = getActiveProjectId()

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col bg-slate-900 text-slate-100 transition-transform duration-300",
          "w-[250px]",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/projects" className="flex items-center gap-2 text-sm font-semibold text-slate-100 no-underline hover:text-white">
            <FolderKanban className="h-5 w-5 text-slate-400" />
            <span>ProjectFlow</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
            <span className="sr-only">Fermer le menu</span>
          </Button>
        </div>

        <Separator className="bg-slate-700" />

        <div className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Projets
          </p>

          <nav className="flex flex-col gap-0.5">
            {projects.map((project) => {
              const isActive = activeProjectId === project.id
              return (
                <div
                  key={project.id}
                  className={cn(
                    "group flex items-center rounded-md",
                    isActive ? "bg-slate-700" : "hover:bg-slate-800"
                  )}
                >
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm no-underline",
                      isActive ? "text-white" : "text-slate-300 hover:text-white"
                    )}
                  >
                    <FolderKanban className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{project.name}</span>
                  </Link>

                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to="/projects/$projectId/settings"
                          params={{ projectId: project.id }}
                          className={cn(
                            "mr-1 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100",
                            "text-slate-400 hover:bg-slate-600 hover:text-slate-100 no-underline",
                            isActive && "opacity-100"
                          )}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          <span className="sr-only">Paramètres</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Paramètres</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )
            })}

            {projects.length === 0 && (
              <p className="px-2 py-2 text-xs text-slate-500">Aucun projet</p>
            )}
          </nav>
        </div>

        <Separator className="bg-slate-700" />

        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

export function SidebarToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Ouvrir le menu</span>
    </Button>
  )
}
