import {
  doc, collection, getCollectionQuery,
  onCollection, addDoc, updateDoc, deleteDoc,
  Timestamp,
} from "@/firebase"
import { getFirestore, runTransaction as runTransactionFirebase } from "firebase/firestore"
import app from "@/firebase"
import type { Card, CardStatus } from "@/lib/types"

const db = getFirestore(app)

export const onProjectCards = (projectId: string, callback: (cards: Card[]) => void) => {
  const ref = collection("projects", projectId, "cards")
  return onCollection<Card>(ref, callback)
}

export const createCard = async (
  projectId: string,
  data: Pick<Card, "title" | "description" | "priority"> & { assigneeId?: string; deadline?: Date; createdBy: string }
): Promise<Card> => {
  const projectRef = doc("projects", projectId)

  // Use transaction to atomically increment cardCounter
  let newRef = ""
  let cardId = ""
  await runTransactionFirebase(db, async (transaction) => {
    const projectSnap = await transaction.get(projectRef as any)
    if (!projectSnap.exists()) throw new Error("Projet non trouvé")
    const project = projectSnap.data() as { cardCounter?: number } | undefined
    const newCounter = (project?.cardCounter || 0) + 1
    newRef = `PM-${newCounter}`
    transaction.update(projectRef as any, { cardCounter: newCounter })
  })

  const cardData = {
    title: data.title,
    description: data.description || "",
    status: "backlog" as CardStatus,
    priority: data.priority || "medium",
    assigneeId: data.assigneeId || null,
    deadline: data.deadline ? Timestamp.fromDate(data.deadline) : null,
    order: Date.now(),
    ref: newRef,
    gitBranch: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: data.createdBy,
  }

  const ref = await addDoc(collection("projects", projectId, "cards"), cardData)
  cardId = ref.id
  return { id: cardId, ...cardData, createdAt: new Date(), updatedAt: new Date(), deadline: data.deadline || undefined } as any as Card
}

export const updateCard = (projectId: string, cardId: string, data: Partial<Card>) =>
  updateDoc(doc("projects", projectId, "cards", cardId), {
    ...data,
    updatedAt: Timestamp.now(),
  })

export const moveCard = (projectId: string, cardId: string, newStatus: CardStatus, newOrder?: number) =>
  updateDoc(doc("projects", projectId, "cards", cardId), {
    status: newStatus,
    ...(newOrder !== undefined ? { order: newOrder } : {}),
    updatedAt: Timestamp.now(),
  })

export const deleteCard = (projectId: string, cardId: string) =>
  deleteDoc(doc("projects", projectId, "cards", cardId))
