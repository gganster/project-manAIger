import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumn } from "./kanban-column"
import { KanbanCardOverlay } from "./kanban-card"
import { moveCard, updateCard } from "./firestore"
import type { Card, CardStatus } from "@/lib/types"
import { CARD_STATUS_ORDER } from "@/lib/types"

interface KanbanBoardProps {
  cards: Card[]
  projectId: string
  userId: string
  members: Record<string, string>
}

export function KanbanBoard({ cards, projectId, userId, members }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [localCards, setLocalCards] = useState<Card[]>(cards)

  // Sync external cards into local state when parent updates
  // We use localCards for optimistic rendering during drag
  const displayCards = activeCard ? localCards : cards

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function getCardById(id: string): Card | undefined {
    return cards.find((c) => c.id === id)
  }

  function getCardsForStatus(status: CardStatus, cardList: Card[]): Card[] {
    return cardList.filter((c) => c.status === status).sort((a, b) => a.order - b.order)
  }

  function handleDragStart(event: DragStartEvent) {
    const card = getCardById(event.active.id as string)
    if (card) {
      setActiveCard(card)
      setLocalCards([...cards])
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeCard = localCards.find((c) => c.id === activeId)
    if (!activeCard) return

    // Check if dropping over a column (the droppable id is the status)
    const isOverColumn = CARD_STATUS_ORDER.includes(overId as CardStatus)

    if (isOverColumn) {
      const newStatus = overId as CardStatus
      if (activeCard.status !== newStatus) {
        setLocalCards((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, status: newStatus } : c
          )
        )
      }
      return
    }

    // Over another card
    const overCard = localCards.find((c) => c.id === overId)
    if (!overCard) return

    if (activeCard.status !== overCard.status) {
      setLocalCards((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, status: overCard.status } : c
        )
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const sourceCard = cards.find((c) => c.id === activeId)
    if (!sourceCard) return

    const isOverColumn = CARD_STATUS_ORDER.includes(overId as CardStatus)
    const targetStatus: CardStatus = isOverColumn
      ? (overId as CardStatus)
      : (cards.find((c) => c.id === overId)?.status ?? sourceCard.status)

    const targetColumnCards = getCardsForStatus(targetStatus, cards)

    if (sourceCard.status === targetStatus) {
      // Reorder within same column
      if (isOverColumn || activeId === overId) return

      const oldIndex = targetColumnCards.findIndex((c) => c.id === activeId)
      const newIndex = targetColumnCards.findIndex((c) => c.id === overId)

      if (oldIndex === newIndex) return

      const reordered = arrayMove(targetColumnCards, oldIndex, newIndex)

      // Calculate new order: use midpoint between neighbors or timestamp
      const prev = reordered[newIndex - 1]
      const next = reordered[newIndex + 1]

      let newOrder: number
      if (prev && next) {
        newOrder = Math.round((prev.order + next.order) / 2)
      } else if (prev) {
        newOrder = prev.order + 1000
      } else if (next) {
        newOrder = next.order - 1000
      } else {
        newOrder = Date.now()
      }

      updateCard(projectId, activeId, { order: newOrder })
    } else {
      // Move to different column
      const newOrder =
        targetColumnCards.length > 0
          ? targetColumnCards[targetColumnCards.length - 1].order + 1000
          : Date.now()

      moveCard(projectId, activeId, targetStatus, newOrder)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {CARD_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={displayCards.filter((c) => c.status === status)}
            projectId={projectId}
            userId={userId}
            members={members}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <KanbanCardOverlay card={activeCard} members={members} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
