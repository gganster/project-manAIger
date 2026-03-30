import { useState } from "react"
import { inviteMember } from "./firestore"
import type { ProjectRole } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess?: () => void
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ProjectRole>("user")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await inviteMember(projectId, email.trim(), role)
      onOpenChange(false)
      setEmail("")
      setRole("user")
      onSuccess?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(value: boolean) {
    if (!submitting) {
      setEmail("")
      setRole("user")
      setError(null)
      onOpenChange(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utilisateur@exemple.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !email.trim()}>
              {submitting ? "Invitation..." : "Inviter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
