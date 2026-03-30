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
import { updateCard, deleteCard } from "./firestore"
import type { Card, CardPriority, CardStatus } from "@/lib/types"
import {
  CARD_PRIORITY_LABELS,
  CARD_STATUS_LABELS,
  CARD_STATUS_ORDER,
} from "@/lib/types"

interface EditCardDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  card: Card
  members: Record<string, string>
}

export function EditCardDialog({
  open,
  onClose,
  projectId,
  card,
  members,
}: EditCardDialogProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [priority, setPriority] = useState<CardPriority>(card.priority)
  const [status, setStatus] = useState<CardStatus>(card.status)
  const [assigneeId, setAssigneeId] = useState<string>(card.assigneeId ?? "")
  const [deadline, setDeadline] = useState<string>(
    card.deadline ? card.deadline.toISOString().split("T")[0] : ""
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const updates: Partial<Card> = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assigneeId: assigneeId || undefined,
        deadline: deadline ? new Date(deadline) : undefined,
      }
      await updateCard(projectId, card.id, updates)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await deleteCard(projectId, card.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setConfirmDelete(false)
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier — {card.ref}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Titre</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-priority">Priorité</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as CardPriority)}
              >
                <SelectTrigger id="edit-priority" className="w-full">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-status">Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CardStatus)}
              >
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CARD_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-assignee">Assigné</Label>
            <Select
              value={assigneeId || "unassigned"}
              onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}
            >
              <SelectTrigger id="edit-assignee" className="w-full">
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assigné</SelectItem>
                {Object.entries(members).map(([uid, name]) => (
                  <SelectItem key={uid} value={uid}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-deadline">Échéance</Label>
            <Input
              id="edit-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="sm:mr-auto"
            >
              {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !title.trim()}>
                Sauvegarder
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
