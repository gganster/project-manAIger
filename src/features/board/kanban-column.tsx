import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanCard } from "./kanban-card"
import { CreateCardDialog } from "./create-card-dialog"
import type { Card, CardStatus } from "@/lib/types"
import { CARD_STATUS_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  status: CardStatus
  cards: Card[]
  projectId: string
  userId: string
  members: Record<string, string>
}

export function KanbanColumn({
  status,
  cards,
  projectId,
  userId,
  members,
}: KanbanColumnProps) {
  const [createOpen, setCreateOpen] = useState(false)

  const { setNodeRef, isOver } = useDroppable({ id: status })

  const sortedCards = [...cards].sort((a, b) => a.order - b.order)
  const cardIds = sortedCards.map((c) => c.id)

  return (
    <>
      <div className="flex w-[300px] shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{CARD_STATUS_LABELS[status]}</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              {cards.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCreateOpen(true)}
            title="Ajouter une carte"
          >
            <PlusIcon />
          </Button>
        </div>

        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-[120px] flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
            isOver
              ? "border-primary bg-primary/5"
              : "border-transparent bg-muted/30"
          )}
        >
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {sortedCards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                projectId={projectId}
                members={members}
              />
            ))}
          </SortableContext>
          {sortedCards.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-4">
              <span className="text-xs text-muted-foreground">Aucune carte</span>
            </div>
          )}
        </div>
      </div>

      <CreateCardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        userId={userId}
      />
    </>
  )
}
