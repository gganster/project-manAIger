import { z } from "zod"
import { db } from "../lib/firebase-admin.js"
import type { Card, CardPriority, CardStatus } from "../lib/types.js"

// ── list_cards ──

export const listCardsSchema = {
  projectId: z.string().describe("Project ID"),
  status: z
    .enum(["backlog", "in_progress", "testing", "done"])
    .optional()
    .describe("Filter by status"),
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
      const parts = [
        `[${card.ref ?? doc.id}] ${card.title}`,
        `status: ${card.status}`,
        `priority: ${card.priority}`,
      ]
      if (card.assigneeId) parts.push(`assignee: ${card.assigneeId}`)
      if (card.gitBranch) parts.push(`branch: ${card.gitBranch}`)
      lines.push(`- ${parts.join(" | ")}`)
    }

    return lines.join("\n")
  } catch (error) {
    return `Error listing cards: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── get_card ──

export const getCardSchema = {
  projectId: z.string().describe("Project ID"),
  cardId: z.string().describe("Card ID"),
}

export async function getCard(params: {
  projectId: string
  cardId: string
}): Promise<string> {
  try {
    const { projectId, cardId } = params

    const cardDoc = await db
      .collection("projects")
      .doc(projectId)
      .collection("cards")
      .doc(cardId)
      .get()

    if (!cardDoc.exists) {
      return `Card not found: ${cardId} in project ${projectId}`
    }

    const card = cardDoc.data() as Card
    const lines: string[] = [
      `Card: ${card.ref} — ${card.title}`,
      `ID: ${cardDoc.id}`,
      `Status: ${card.status}`,
      `Priority: ${card.priority}`,
      `Description: ${card.description || "(none)"}`,
    ]
    if (card.assigneeId) lines.push(`Assignee: ${card.assigneeId}`)
    if (card.gitBranch) lines.push(`Git branch: ${card.gitBranch}`)
    if (card.deadline) lines.push(`Deadline: ${card.deadline}`)
    lines.push(`Created by: ${card.createdBy}`)

    return lines.join("\n")
  } catch (error) {
    return `Error getting card: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── create_card ──

export const createCardSchema = {
  projectId: z.string().describe("Project ID"),
  title: z.string().describe("Card title"),
  description: z.string().optional().describe("Card description"),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .optional()
    .describe("Card priority (default: medium)"),
  assigneeId: z.string().optional().describe("Assignee user ID"),
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

// ── update_card ──

export const updateCardSchema = {
  projectId: z.string().describe("Project ID"),
  cardId: z.string().describe("Card ID"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .optional()
    .describe("New priority"),
  status: z
    .enum(["backlog", "in_progress", "testing", "done"])
    .optional()
    .describe("New status"),
  assigneeId: z.string().optional().describe("New assignee user ID"),
  gitBranch: z.string().optional().describe("Git branch name"),
}

export async function updateCard(params: {
  projectId: string
  cardId: string
  title?: string
  description?: string
  priority?: CardPriority
  status?: CardStatus
  assigneeId?: string
  gitBranch?: string
}): Promise<string> {
  try {
    const {
      projectId,
      cardId,
      title,
      description,
      priority,
      status,
      assigneeId,
      gitBranch,
    } = params

    const cardRef = db
      .collection("projects")
      .doc(projectId)
      .collection("cards")
      .doc(cardId)

    const cardDoc = await cardRef.get()
    if (!cardDoc.exists) {
      return `Card not found: ${cardId} in project ${projectId}`
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (priority !== undefined) updates.priority = priority
    if (status !== undefined) updates.status = status
    if (assigneeId !== undefined) updates.assigneeId = assigneeId
    if (gitBranch !== undefined) updates.gitBranch = gitBranch

    await cardRef.update(updates)

    const updatedFields = Object.keys(updates)
      .filter((k) => k !== "updatedAt")
      .join(", ")

    return `Card ${cardId} updated successfully. Fields changed: ${updatedFields || "none"}`
  } catch (error) {
    return `Error updating card: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── move_card ──

export const moveCardSchema = {
  projectId: z.string().describe("Project ID"),
  cardId: z.string().describe("Card ID"),
  status: z
    .enum(["backlog", "in_progress", "testing", "done"])
    .describe("Target status column"),
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
      return `Card ${card.ref ?? cardId} is already in status "${status}".`
    }

    await cardRef.update({ status, updatedAt: new Date() })

    return `Card ${card.ref ?? cardId} moved from "${oldStatus}" to "${status}".`
  } catch (error) {
    return `Error moving card: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── delete_card ──

export const deleteCardSchema = {
  projectId: z.string().describe("Project ID"),
  cardId: z.string().describe("Card ID"),
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
