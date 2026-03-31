import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Separator } from "@/components/ui/separator"
import { ChangePasswordSection } from "@/components/change-password-section"

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
    </main>
  )
}
