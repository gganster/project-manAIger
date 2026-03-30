import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { createProject } from "./firestore"
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

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSubmitting(true)
    try {
      const projectId = await createProject(name.trim(), user.uid)
      onOpenChange(false)
      setName("")
      navigate({ to: "/projects/$projectId", params: { projectId } })
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(value: boolean) {
    if (!submitting) {
      setName("")
      setError(null)
      onOpenChange(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nom du projet</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon projet"
              required
              autoFocus
            />
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
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
