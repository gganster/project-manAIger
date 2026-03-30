import { z } from "zod"
import { db } from "../lib/firebase-admin.js"
import type { Card, CardStatus, Project } from "../lib/types.js"

export const listProjectsSchema = {
  userId: z.string().optional(),
}

export async function listProjects(params: {
  userId?: string
}): Promise<string> {
  try {
    const { userId } = params
    const projectsRef = db.collection("projects")

    let snapshot: FirebaseFirestore.QuerySnapshot

    if (userId) {
      snapshot = await projectsRef
        .where(`members.${userId}`, "!=", null)
        .get()
    } else {
      snapshot = await projectsRef.get()
    }

    if (snapshot.empty) {
      return "No projects found."
    }

    const lines: string[] = ["Projects:"]
    for (const doc of snapshot.docs) {
      const project = doc.data() as Project
      const memberCount = Object.keys(project.members ?? {}).length
      lines.push(
        `- [${doc.id}] ${project.name} (${memberCount} member${memberCount !== 1 ? "s" : ""})`
      )
    }

    return lines.join("\n")
  } catch (error) {
    return `Error listing projects: ${error instanceof Error ? error.message : String(error)}`
  }
}

export const getProjectSummarySchema = {
  projectId: z.string(),
}

export async function getProjectSummary(params: {
  projectId: string
}): Promise<string> {
  try {
    const { projectId } = params

    const projectDoc = await db.collection("projects").doc(projectId).get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const project = projectDoc.data() as Project

    const cardsSnapshot = await db
      .collection("projects")
      .doc(projectId)
      .collection("cards")
      .get()

    const statusCounts: Record<CardStatus, number> = {
      backlog: 0,
      in_progress: 0,
      testing: 0,
      done: 0,
    }

    const statusCards: Record<CardStatus, string[]> = {
      backlog: [],
      in_progress: [],
      testing: [],
      done: [],
    }

    for (const doc of cardsSnapshot.docs) {
      const card = doc.data() as Card
      const status = card.status as CardStatus
      if (status in statusCounts) {
        statusCounts[status]++
        statusCards[status].push(card.ref ?? doc.id)
      }
    }

    const statusLabels: Record<CardStatus, string> = {
      backlog: "Backlog",
      in_progress: "In Progress",
      testing: "Testing",
      done: "Done",
    }

    const lines: string[] = [
      `Project: ${project.name} (${projectId})`,
      `Total cards: ${cardsSnapshot.size}`,
      "",
    ]

    const columns: CardStatus[] = ["backlog", "in_progress", "testing", "done"]
    for (const status of columns) {
      const count = statusCounts[status]
      const refs = statusCards[status]
      lines.push(
        `${statusLabels[status]}: ${count} card${count !== 1 ? "s" : ""}`
      )
      if (refs.length > 0) {
        lines.push(`  ${refs.join(", ")}`)
      }
    }

    return lines.join("\n")
  } catch (error) {
    return `Error getting project summary: ${error instanceof Error ? error.message : String(error)}`
  }
}
