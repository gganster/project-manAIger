import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EditCardDialog } from "./edit-card-dialog"
import type { Card as CardType, CardPriority } from "@/lib/types"
import { CARD_PRIORITY_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

const PRIORITY_CLASSES: Record<CardPriority, string> = {
  low: "bg-muted text-muted-foreground border-muted",
  medium: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  urgent: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
}

interface KanbanCardProps {
  card: CardType
  projectId: string
  members: Record<string, string>
  overlay?: boolean
}

export function KanbanCard({ card, projectId, members, overlay = false }: KanbanCardProps) {
  const [editOpen, setEditOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const assigneeName = card.assigneeId ? members[card.assigneeId] : undefined
  const assigneeInitials = assigneeName
    ? assigneeName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : undefined

  const deadlineStr = card.deadline
    ? new Date(card.deadline).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      })
    : undefined

  const isOverdue =
    card.deadline && new Date(card.deadline) < new Date() && card.status !== "done"

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "touch-none",
          isDragging && !overlay && "opacity-40"
        )}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation()
          setEditOpen(true)
        }}
      >
        <Card
          size="sm"
          className={cn(
            "cursor-pointer gap-2 py-2 transition-shadow hover:shadow-md hover:ring-foreground/20",
            overlay && "rotate-1 shadow-lg"
          )}
        >
          <div className="flex items-start justify-between gap-2 px-3">
            <span className="text-xs font-mono text-muted-foreground shrink-0">{card.ref}</span>
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                PRIORITY_CLASSES[card.priority]
              )}
            >
              {CARD_PRIORITY_LABELS[card.priority]}
            </span>
          </div>
          <div className="px-3">
            <p className="text-sm font-medium leading-snug line-clamp-2">{card.title}</p>
          </div>
          {(assigneeName || deadlineStr) && (
            <div className="flex items-center justify-between gap-2 px-3">
              {deadlineStr && (
                <span
                  className={cn(
                    "text-xs",
                    isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {deadlineStr}
                </span>
              )}
              {assigneeName && (
                <Avatar size="sm" className="ml-auto">
                  <AvatarFallback>{assigneeInitials}</AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </Card>
      </div>

      <EditCardDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        card={card}
        members={members}
      />
    </>
  )
}

export function KanbanCardOverlay({
  card,
  members,
}: {
  card: CardType
  members: Record<string, string>
}) {
  const assigneeName = card.assigneeId ? members[card.assigneeId] : undefined
  const assigneeInitials = assigneeName
    ? assigneeName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : undefined

  const deadlineStr = card.deadline
    ? new Date(card.deadline).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      })
    : undefined

  const isOverdue =
    card.deadline && new Date(card.deadline) < new Date() && card.status !== "done"

  return (
    <Card
      size="sm"
      className="cursor-grabbing gap-2 py-2 rotate-1 shadow-lg ring-foreground/20"
    >
      <div className="flex items-start justify-between gap-2 px-3">
        <span className="text-xs font-mono text-muted-foreground shrink-0">{card.ref}</span>
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            PRIORITY_CLASSES[card.priority]
          )}
        >
          {CARD_PRIORITY_LABELS[card.priority]}
        </span>
      </div>
      <div className="px-3">
        <p className="text-sm font-medium leading-snug line-clamp-2">{card.title}</p>
      </div>
      {(assigneeName || deadlineStr) && (
        <div className="flex items-center justify-between gap-2 px-3">
          {deadlineStr && (
            <span
              className={cn(
                "text-xs",
                isOverdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {deadlineStr}
            </span>
          )}
          {assigneeName && (
            <Avatar size="sm" className="ml-auto">
              <AvatarFallback>{assigneeInitials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </Card>
  )
}
