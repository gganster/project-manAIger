import { z } from "zod"
import { db } from "../lib/firebase-admin.js"
import type { Card, CardStatus, Project } from "../lib/types.js"

// ── list_projects ──

export const listProjectsSchema = {
  userId: z.string().optional().describe("Filter projects by member userId"),
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

// ── get_project ──

export const getProjectSchema = {
  projectId: z.string().describe("Project ID"),
}

export async function getProject(params: {
  projectId: string
}): Promise<string> {
  try {
    const { projectId } = params

    const projectDoc = await db.collection("projects").doc(projectId).get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const project = projectDoc.data() as Project
    const members = Object.entries(project.members ?? {})

    const lines: string[] = [
      `Project: ${project.name}`,
      `ID: ${projectId}`,
      `Slug: ${project.slug}`,
      `Owner: ${project.ownerId}`,
      `Card counter: ${project.cardCounter}`,
      `Members (${members.length}):`,
    ]

    for (const [uid, role] of members) {
      lines.push(`  - ${uid} (${role})`)
    }

    return lines.join("\n")
  } catch (error) {
    return `Error getting project: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── get_project_summary ──

export const getProjectSummarySchema = {
  projectId: z.string().describe("Project ID"),
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

// ── create_project ──

export const createProjectSchema = {
  name: z.string().describe("Project name"),
  ownerId: z.string().describe("UID of the project owner"),
}

export async function createProject(params: {
  name: string
  ownerId: string
}): Promise<string> {
  try {
    const { name, ownerId } = params
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const now = new Date()
    const ref = await db.collection("projects").add({
      name,
      slug,
      ownerId,
      members: { [ownerId]: "admin" },
      cardCounter: 0,
      settings: {},
      createdAt: now,
      updatedAt: now,
    })

    return [
      `Project created successfully.`,
      `ID: ${ref.id}`,
      `Name: ${name}`,
      `Slug: ${slug}`,
      `Owner: ${ownerId}`,
    ].join("\n")
  } catch (error) {
    return `Error creating project: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── update_project ──

export const updateProjectSchema = {
  projectId: z.string().describe("Project ID"),
  name: z.string().optional().describe("New project name"),
}

export async function updateProject(params: {
  projectId: string
  name?: string
}): Promise<string> {
  try {
    const { projectId, name } = params

    const projectRef = db.collection("projects").doc(projectId)
    const projectDoc = await projectRef.get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) {
      updates.name = name
      updates.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    }

    await projectRef.update(updates)

    const updatedFields = Object.keys(updates)
      .filter((k) => k !== "updatedAt")
      .join(", ")

    return `Project ${projectId} updated. Fields changed: ${updatedFields || "none"}`
  } catch (error) {
    return `Error updating project: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── delete_project ──

export const deleteProjectSchema = {
  projectId: z.string().describe("Project ID"),
}

export async function deleteProject(params: {
  projectId: string
}): Promise<string> {
  try {
    const { projectId } = params

    const projectRef = db.collection("projects").doc(projectId)
    const projectDoc = await projectRef.get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const project = projectDoc.data() as Project

    // Delete all cards in the project
    const cardsSnapshot = await projectRef.collection("cards").get()
    const batch = db.batch()
    for (const doc of cardsSnapshot.docs) {
      batch.delete(doc.ref)
    }
    batch.delete(projectRef)
    await batch.commit()

    return `Project "${project.name}" (${projectId}) and its ${cardsSnapshot.size} card(s) deleted successfully.`
  } catch (error) {
    return `Error deleting project: ${error instanceof Error ? error.message : String(error)}`
  }
}
