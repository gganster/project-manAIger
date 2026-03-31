import { useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
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
  const pendingUpdates = useRef<Map<string, Partial<Card>>>(new Map())

  // Sync from Firestore, merge with pending optimistic changes
  useEffect(() => {
    if (pendingUpdates.current.size === 0) {
      setLocalCards(cards)
      return
    }

    const nextPending = new Map(pendingUpdates.current)
    const merged = cards.map((card) => {
      const pending = nextPending.get(card.id)
      if (!pending) return card

      const caught = Object.entries(pending).every(
        ([key, value]) => (card as Record<string, unknown>)[key] === value
      )
      if (caught) {
        nextPending.delete(card.id)
        return card
      }
      return { ...card, ...pending }
    })
    pendingUpdates.current = nextPending
    setLocalCards(merged)
  }, [cards])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function getCardsForStatus(status: CardStatus, cardList: Card[]): Card[] {
    return cardList.filter((c) => c.status === status).sort((a, b) => a.order - b.order)
  }

  function applyOptimistic(cardId: string, changes: Partial<Card>) {
    pendingUpdates.current.set(cardId, {
      ...pendingUpdates.current.get(cardId),
      ...changes,
    })
    setLocalCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, ...changes } : c))
    )
  }

  function handleDragStart(event: DragStartEvent) {
    const card = localCards.find((c) => c.id === (event.active.id as string))
    if (card) setActiveCard(card)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const sourceCard = localCards.find((c) => c.id === activeId)
    if (!sourceCard) return

    // Resolve target status: column id = status, card id = look up the card's status
    const isOverColumn = CARD_STATUS_ORDER.includes(overId as CardStatus)
    const targetStatus: CardStatus = isOverColumn
      ? (overId as CardStatus)
      : (localCards.find((c) => c.id === overId)?.status ?? sourceCard.status)

    if (sourceCard.status === targetStatus) {
      // Reorder within same column
      if (isOverColumn) return

      const columnCards = getCardsForStatus(targetStatus, localCards)
      const oldIndex = columnCards.findIndex((c) => c.id === activeId)
      const newIndex = columnCards.findIndex((c) => c.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const reordered = arrayMove(columnCards, oldIndex, newIndex)

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

      applyOptimistic(activeId, { order: newOrder })
      updateCard(projectId, activeId, { order: newOrder })
    } else {
      // Move to different column
      const targetColumnCards = getCardsForStatus(targetStatus, localCards)
      const newOrder =
        targetColumnCards.length > 0
          ? targetColumnCards[targetColumnCards.length - 1].order + 1000
          : Date.now()

      applyOptimistic(activeId, { status: targetStatus, order: newOrder })
      moveCard(projectId, activeId, targetStatus, newOrder)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {CARD_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={localCards.filter((c) => c.status === status)}
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
