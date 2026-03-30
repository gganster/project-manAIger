import { z } from "zod"
import { db } from "../lib/firebase-admin.js"
import type { Card, CardPriority, CardStatus } from "../lib/types.js"

export const listCardsSchema = {
  projectId: z.string(),
  status: z
    .enum(["backlog", "in_progress", "testing", "done"])
    .optional(),
}

export async function listCards(params: {
  projectId: string
  status?: CardStatus
}): Promise<string> {
  try {
    const { projectId, status } = params
    let query: FirebaseFirestore.Query = db
      .collection("projects")
      .doc(projectId)
      .collection("cards")

    if (status) {
      query = query.where("status", "==", status)
    }

    const snapshot = await query.get()

    if (snapshot.empty) {
      return `No cards found in project ${projectId}${status ? ` with status "${status}"` : ""}.`
    }

    const lines: string[] = [
      `Cards in project ${projectId}${status ? ` (${status})` : ""}:`,
    ]

    for (const doc of snapshot.docs) {
      const card = doc.data() as Card
      lines.push(
        `- [${card.ref ?? doc.id}] ${card.title} | status: ${card.status} | priority: ${card.priority}`
      )
    }

    return lines.join("\n")
  } catch (error) {
    return `Error listing cards: ${error instanceof Error ? error.message : String(error)}`
  }
}

export const createCardSchema = {
  projectId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().optional(),
}

export async function createCard(params: {
  projectId: string
  title: string
  description?: string
  priority?: CardPriority
  assigneeId?: string
}): Promise<string> {
  try {
    const { projectId, title, description, priority, assigneeId } = params

    const projectRef = db.collection("projects").doc(projectId)
    const cardsRef = projectRef.collection("cards")

    let cardRef: FirebaseFirestore.DocumentReference | null = null
    let cardData: Partial<Card> | null = null

    await db.runTransaction(async (transaction) => {
      const projectDoc = await transaction.get(projectRef)
      if (!projectDoc.exists) {
        throw new Error(`Project not found: ${projectId}`)
      }

      const project = projectDoc.data() as { cardCounter?: number }
      const counter = (project.cardCounter ?? 0) + 1
      const ref = `PM-${counter}`
      const now = new Date()

      cardRef = cardsRef.doc()
      cardData = {
        id: cardRef.id,
        title,
        description: description ?? "",
        status: "backlog",
        priority: priority ?? "medium",
        order: Date.now(),
        ref,
        createdAt: now,
        updatedAt: now,
        createdBy: "mcp",
      }

      if (assigneeId) cardData.assigneeId = assigneeId

      transaction.update(projectRef, { cardCounter: counter })
      transaction.set(cardRef, cardData)
    })

    if (!cardRef || !cardData) {
      return "Error: transaction did not complete."
    }

    const created = cardData as Card
    return [
      `Card created successfully.`,
      `Ref: ${created.ref}`,
      `ID: ${created.id}`,
      `Title: ${created.title}`,
      `Status: ${created.status}`,
      `Priority: ${created.priority}`,
    ].join("\n")
  } catch (error) {
    return `Error creating card: ${error instanceof Error ? error.message : String(error)}`
  }
}

export const updateCardSchema = {
  projectId: z.string(),
  cardId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["backlog", "in_progress", "testing", "done"]).optional(),
  assigneeId: z.string().optional(),
}

export async function updateCard(params: {
  projectId: string
  cardId: string
  title?: string
  description?: string
  priority?: CardPriority
  status?: CardStatus
  assigneeId?: string
}): Promise<string> {
  try {
    const { projectId, cardId, title, description, priority, status, assigneeId } =
      params

    const cardRef = db
      .collection("projects")
      .doc(projectId)
      .collection("cards")
      .doc(cardId)

    const cardDoc = await cardRef.get()
    if (!cardDoc.exists) {
      return `Card not found: ${cardId} in project ${projectId}`
    }

    const updates: Partial<Card> & { updatedAt: Date } = {
      updatedAt: new Date(),
    }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (priority !== undefined) updates.priority = priority
    if (status !== undefined) updates.status = status
    if (assigneeId !== undefined) updates.assigneeId = assigneeId

    await cardRef.update(updates)

    const updatedFields = Object.keys(updates)
      .filter((k) => k !== "updatedAt")
      .join(", ")

    return `Card ${cardId} updated successfully. Fields changed: ${updatedFields || "none"}`
  } catch (error) {
    return `Error updating card: ${error instanceof Error ? error.message : String(error)}`
  }
}

export const moveCardSchema = {
  projectId: z.string(),
  cardId: z.string(),
  status: z.enum(["backlog", "in_progress", "testing", "done"]),
}

export async function moveCard(params: {
  projectId: string
  cardId: string
  status: CardStatus
}): Promise<string> {
  try {
    const { projectId, cardId, status } = params

    const cardRef = db
      .collection("projects")
      .doc(projectId)
      .collection("cards")
      .doc(cardId)

    const cardDoc = await cardRef.get()
    if (!cardDoc.exists) {
      return `Card not found: ${cardId} in project ${projectId}`
    }

    const card = cardDoc.data() as Card
    const oldStatus = card.status

    if (oldStatus === status) {
      return `Card ${cardId} is already in status "${status}".`
    }

    await cardRef.update({ status, updatedAt: new Date() })

    return `Card ${cardId} moved from "${oldStatus}" to "${status}".`
  } catch (error) {
    return `Error moving card: ${error instanceof Error ? error.message : String(error)}`
  }
}

export const deleteCardSchema = {
  projectId: z.string(),
  cardId: z.string(),
}

export async function deleteCard(params: {
  projectId: string
  cardId: string
}): Promise<string> {
  try {
    const { projectId, cardId } = params

    const cardRef = db
      .collection("projects")
      .doc(projectId)
      .collection("cards")
      .doc(cardId)

    const cardDoc = await cardRef.get()
    if (!cardDoc.exists) {
      return `Card not found: ${cardId} in project ${projectId}`
    }

    const card = cardDoc.data() as Card
    await cardRef.delete()

    return `Card ${card.ref ?? cardId} ("${card.title}") deleted successfully.`
  } catch (error) {
    return `Error deleting card: ${error instanceof Error ? error.message : String(error)}`
  }
}
