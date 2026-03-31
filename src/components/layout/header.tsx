import { useState, useEffect } from "react"
import { useRouterState, useNavigate } from "@tanstack/react-router"
import { LogOut, Menu, UserCog } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getUserProjects } from "@/features/project/firestore"
import type { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface HeaderProps {
  onMenuToggle: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AppHeader({ onMenuToggle }: HeaderProps) {
  const { user, appUser, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!user) return
    const unsubscribe = getUserProjects(user.uid, (p) => setProjects(p))
    return unsubscribe
  }, [user])

  function getBreadcrumb(): React.ReactNode {
    const settingsMatch = pathname.match(/^\/projects\/([^/]+)\/settings$/)
    const projectMatch = pathname.match(/^\/projects\/([^/]+)$/)
    const projectsMatch = pathname === "/projects"

    if (settingsMatch) {
      const project = projects.find((p) => p.id === settingsMatch[1])
      return (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>{project?.name ?? "Projet"}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium">Paramètres</span>
        </span>
      )
    }

    if (projectMatch) {
      const project = projects.find((p) => p.id === projectMatch[1])
      return (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>{project?.name ?? "Projet"}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium">Board</span>
        </span>
      )
    }

    if (projectsMatch) {
      return <span className="text-sm font-medium text-foreground">Projets</span>
    }

    if (pathname === "/profile") {
      return <span className="text-sm font-medium text-foreground">Mon profil</span>
    }

    return null
  }

  const displayName = appUser?.displayName ?? user?.email ?? ""
  const initials = displayName ? getInitials(displayName) : "?"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="mr-3 h-8 w-8 md:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Ouvrir le menu</span>
      </Button>

      <div className="flex flex-1 items-center">
        {getBreadcrumb()}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar size="sm">
                <AvatarFallback className="bg-slate-700 text-xs text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {displayName && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  {appUser?.email && appUser.email !== displayName && (
                    <p className="mt-1 text-xs text-muted-foreground">{appUser.email}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate({ to: "/profile" })}
            >
              <UserCog className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
