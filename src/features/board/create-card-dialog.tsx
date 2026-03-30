import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createCard } from "./firestore"
import type { CardPriority } from "@/lib/types"
import { CARD_PRIORITY_LABELS } from "@/lib/types"

interface CreateCardDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  userId: string
}

export function CreateCardDialog({
  open,
  onClose,
  projectId,
  userId,
}: CreateCardDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<CardPriority>("medium")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createCard(projectId, {
        title: title.trim(),
        description: description.trim(),
        priority,
        createdBy: userId,
      })
      setTitle("")
      setDescription("")
      setPriority("medium")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle carte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-title">Titre</Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la carte"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-priority">Priorité</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as CardPriority)}
            >
              <SelectTrigger id="create-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CARD_PRIORITY_LABELS) as [CardPriority, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
