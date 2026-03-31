import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { getProject, updateProject, deleteProject, removeMember, getUser } from "@/features/project/firestore"
import type { Project, AppUser, ProjectRole, GitHubConnection } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { InviteMemberDialog } from "@/features/project/invite-member-dialog"
import { PlusIcon, GitBranch } from "lucide-react"
import { listRepos } from "@/actions/github/serverListRepos"
import { linkRepo } from "@/actions/github/serverLinkRepo"
import { unlinkRepo } from "@/actions/github/serverUnlinkRepo"
import type { GitHubRepo } from "@/lib/github"

export const Route = createFileRoute("/projects/$projectId/settings")({
  validateSearch: (search): { github?: string } => ({
    github: search.github as string | undefined,
  }),
  component: ProjectSettingsPage,
})

interface MemberRow {
  uid: string
  appUser: AppUser | null
  role: ProjectRole
}

function ProjectSettingsPage() {
  const { projectId } = Route.useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [fetching, setFetching] = useState(true)
  const [members, setMembers] = useState<MemberRow[]>([])

  // GitHub state
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState("")
  const [reposLoading, setReposLoading] = useState(false)
  const [githubLinking, setGithubLinking] = useState(false)
  const [githubUnlinking, setGithubUnlinking] = useState(false)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)

  // Delete confirmation dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Remove member confirmation
  const [removeUid, setRemoveUid] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  async function loadProject() {
    const p = await getProject(projectId)
    if (!p || !user || !p.members[user.uid]) {
      navigate({ to: "/projects" })
      return
    }
    setProject(p)

    // Load current user's GitHub connection
    if (user) {
      const currentUserProfile = await getUser(user.uid)
      setGithubConnection(currentUserProfile?.github ?? null)
    }

    // Load member user profiles
    const rows = await Promise.all(
      Object.entries(p.members)
        .filter(([, role]) => role != null)
        .map(async ([uid, role]) => {
          const appUser = await getUser(uid)
          return { uid, appUser, role }
        })
    )
    setMembers(rows)
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" })
      return
    }
    if (!user) return

    loadProject().finally(() => setFetching(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user, loading])

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    )
  }

  if (!project || !user) return null

  const currentUserRole = project.members[user.uid]
  const isAdmin = currentUserRole === "admin"
  const adminCount = Object.values(project.members).filter((r) => r === "admin").length

  async function handleRoleChange(uid: string, newRole: ProjectRole) {
    if (!project) return
    await updateProject(project.id, { members: { ...project.members, [uid]: newRole } })
    await loadProject()
  }

  async function handleRemoveMember() {
    if (!removeUid || !project) return
    setRemoving(true)
    try {
      await removeMember(project.id, removeUid)
      setRemoveUid(null)
      await loadProject()
    } finally {
      setRemoving(false)
    }
  }

  async function handleLoadRepos() {
    if (!user) return
    setReposLoading(true)
    try {
      const idToken = await user.getIdToken()
      const result = await listRepos({ data: { idToken } })
      setRepos(result.repos)
    } catch {
      setRepos([])
    } finally {
      setReposLoading(false)
    }
  }

  async function handleLinkRepo() {
    if (!user || !project || !selectedRepo) return
    setGithubLinking(true)
    try {
      const [owner, repo] = selectedRepo.split("/")
      const idToken = await user.getIdToken()
      await linkRepo({
        data: {
          idToken,
          projectId: project.id,
          owner,
          repo,
          webhookBaseUrl: window.location.origin,
        },
      })
      await loadProject()
      setSelectedRepo("")
      setRepos([])
    } finally {
      setGithubLinking(false)
    }
  }

  async function handleUnlinkRepo() {
    if (!user || !project) return
    setGithubUnlinking(true)
    try {
      const idToken = await user.getIdToken()
      await unlinkRepo({ data: { idToken, projectId: project.id } })
      await loadProject()
    } finally {
      setGithubUnlinking(false)
    }
  }

  async function handleDeleteProject() {
    if (!project) return
    setDeleting(true)
    try {
      await deleteProject(project.id)
      navigate({ to: "/projects" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Parametres</h1>
        <p className="text-muted-foreground">{project.name}</p>
      </div>

      {/* Members section */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Membres</h2>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <PlusIcon className="mr-1 size-4" />
              Inviter
            </Button>
          )}
        </div>
        <div className="divide-y rounded-xl border">
          {members.map(({ uid, appUser, role }) => {
            const isCurrentUser = uid === user.uid
            const isLastAdmin = role === "admin" && adminCount === 1
            return (
              <div
                key={uid}
                className={`flex items-center justify-between gap-4 px-4 py-3 ${isCurrentUser ? "bg-muted/40" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {appUser?.displayName ?? "Utilisateur inconnu"}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{appUser?.email ?? uid}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isAdmin && !isCurrentUser ? (
                    <Select
                      value={role}
                      onValueChange={(v) => handleRoleChange(uid, v as ProjectRole)}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Membre</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={role === "admin" ? "default" : "secondary"}>
                      {role === "admin" ? "Admin" : "Membre"}
                    </Badge>
                  )}
                  {isAdmin && !isCurrentUser && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isLastAdmin}
                      onClick={() => setRemoveUid(uid)}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <Separator className="mb-8" />

      {/* GitHub section */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">GitHub</h2>
        <div className="rounded-xl border p-4 space-y-4">
          {project.settings.github?.webhookActive ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">
                  {project.settings.github.owner}/{project.settings.github.repo}
                </span>
                <Badge variant="secondary" className="ml-auto">Connecté</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Les branches et merges sur ce repo mettent à jour automatiquement le board.
              </p>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={handleUnlinkRepo} disabled={githubUnlinking}>
                  {githubUnlinking ? "Déconnexion..." : "Délier le repository"}
                </Button>
              )}
            </div>
          ) : !githubConnection ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connectez votre compte GitHub pour lier un repository à ce projet.
              </p>
              {isAdmin && (
                <Button
                  onClick={() => {
                    window.location.href = `/api/github/auth?uid=${user.uid}&projectId=${projectId}`
                  }}
                >
                  <GitBranch className="mr-2 h-4 w-4" />
                  Connecter GitHub
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connecté en tant que <strong>{githubConnection.login}</strong>. Sélectionnez un repository à lier.
              </p>
              {repos.length === 0 ? (
                <Button onClick={handleLoadRepos} disabled={reposLoading} variant="outline">
                  {reposLoading ? "Chargement..." : "Charger mes repositories"}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sélectionner un repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {repos.map((r) => (
                        <SelectItem key={r.fullName} value={r.fullName}>
                          {r.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleLinkRepo} disabled={githubLinking || !selectedRepo}>
                    {githubLinking ? "Liaison..." : "Lier"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {isAdmin && (
        <>
          <Separator className="mb-8" />

          {/* Danger zone */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-destructive">Zone de danger</h2>
            <div className="rounded-xl border border-destructive/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Supprimer le projet</p>
                  <p className="text-xs text-muted-foreground">
                    Cette action est irréversible. Toutes les données seront perdues.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Supprimer
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Invite dialog */}
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projectId={projectId}
        onSuccess={loadProject}
      />

      {/* Remove member confirmation */}
      <Dialog open={removeUid !== null} onOpenChange={(v) => { if (!v) setRemoveUid(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer le membre</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir retirer ce membre du projet ?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveUid(null)} disabled={removing}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={removing}>
              {removing ? "Retrait..." : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete project confirmation */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v && !deleting) setDeleteOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le projet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer <strong>{project.name}</strong> ? Cette action est
            irréversible et toutes les données seront perdues.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
