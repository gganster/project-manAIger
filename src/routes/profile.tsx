import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ChangePasswordSection } from "@/components/change-password-section"
import { GitBranch } from "lucide-react"
import { doc, updateDoc } from "@/firebase"
import { deleteField } from "firebase/firestore"

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, appUser, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" })
    }
  }, [user, loading, navigate])

  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnectGitHub() {
    if (!user) return
    setDisconnecting(true)
    try {
      await updateDoc(doc("users", user.uid), { github: deleteField() })
      window.location.reload()
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading || !user || !appUser) return null

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">{appUser.email}</p>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Informations</h2>
        <div className="rounded-xl border p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Nom d'affichage</p>
            <p className="text-sm font-medium">{appUser.displayName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{appUser.email}</p>
          </div>
        </div>
      </section>

      <Separator className="mb-8" />

      <ChangePasswordSection />

      <Separator className="mb-8" />

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">GitHub</h2>
        <div className="rounded-xl border p-4 space-y-3">
          {appUser.github ? (
            <>
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">{appUser.github.login}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Connecté le{" "}
                {new Date(appUser.github.connectedAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <Button variant="outline" size="sm" onClick={handleDisconnectGitHub} disabled={disconnecting}>
                {disconnecting ? "Déconnexion..." : "Déconnecter GitHub"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun compte GitHub connecté. Vous pouvez connecter GitHub depuis les paramètres d'un projet.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
