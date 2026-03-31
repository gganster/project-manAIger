import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ChangePasswordSection() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas.")
      return
    }

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.")
      return
    }

    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Mot de passe actuel incorrect.")
      } else if (code === "auth/weak-password") {
        setError("Le nouveau mot de passe est trop faible.")
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">Mot de passe</h2>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Mot de passe actuel</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">Confirmer le nouveau mot de passe</Label>
          <Input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Mot de passe modifié avec succès.</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Modification..." : "Modifier le mot de passe"}
        </Button>
      </form>
    </section>
  )
}
