import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: search.redirect as string | undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      if (redirect) {
        window.location.href = redirect
      } else {
        navigate({ to: "/projects" })
      }
    }
  }, [user, loading, navigate, redirect])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      if (redirect) {
        window.location.href = redirect
      } else {
        navigate({ to: "/projects" })
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Email ou mot de passe incorrect.")
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Se connecter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Connexion..." : "Se connecter"}
            </Button>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-muted-foreground underline hover:text-foreground">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to="/register" search={{ redirect }} className="underline">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
