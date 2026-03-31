import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/user-not-found") {
        setError("Aucun compte associé à cette adresse email.")
      } else if (code === "auth/invalid-email") {
        setError("Adresse email invalide.")
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Un email de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Entrez votre adresse email pour recevoir un lien de réinitialisation.
              </p>
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
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Envoi..." : "Envoyer le lien"}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/login" className="underline">
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
