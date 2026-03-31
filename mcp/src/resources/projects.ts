import { db } from "../lib/firebase-admin.js"
import type { Card, CardStatus, Project, AppUser } from "../lib/types.js"

export async function readProject(projectId: string): Promise<string> {
  const projectDoc = await db.collection("projects").doc(projectId).get()
  if (!projectDoc.exists) {
    return JSON.stringify({ error: `Project not found: ${projectId}` })
  }

  const project = projectDoc.data() as Project
  const memberEntries = Object.entries(project.members ?? {})

  const members: Array<{
    uid: string
    role: string
    displayName?: string
    email?: string
  }> = []

  for (const [uid, role] of memberEntries) {
    const userDoc = await db.collection("users").doc(uid).get()
    if (userDoc.exists) {
      const user = userDoc.data() as AppUser
      members.push({ uid, role, displayName: user.displayName, email: user.email })
    } else {
      members.push({ uid, role })
    }
  }

  return JSON.stringify(
    {
      id: projectDoc.id,
      name: project.name,
      slug: project.slug,
      ownerId: project.ownerId,
      cardCounter: project.cardCounter,
      members,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    null,
    2
  )
}

export async function readBoard(projectId: string): Promise<string> {
  const projectDoc = await db.collection("projects").doc(projectId).get()
  if (!projectDoc.exists) {
    return JSON.stringify({ error: `Project not found: ${projectId}` })
  }

  const project = projectDoc.data() as Project

  const cardsSnapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("cards")
    .get()

  const columns: Record<CardStatus, Array<{ ref: string; title: string; priority: string; assigneeId?: string }>> = {
    backlog: [],
    in_progress: [],
    testing: [],
    done: [],
  }

  for (const doc of cardsSnapshot.docs) {
    const card = doc.data() as Card
    const entry: { ref: string; title: string; priority: string; assigneeId?: string } = {
      ref: card.ref,
      title: card.title,
      priority: card.priority,
    }
    if (card.assigneeId) entry.assigneeId = card.assigneeId
    if (card.status in columns) {
      columns[card.status].push(entry)
    }
  }

  return JSON.stringify(
    {
      project: project.name,
      projectId,
      totalCards: cardsSnapshot.size,
      columns,
    },
    null,
    2
  )
}

export async function listProjectResources(): Promise<
  Array<{ uri: string; name: string; description: string }>
> {
  const snapshot = await db.collection("projects").get()
  const resources: Array<{ uri: string; name: string; description: string }> = []

  for (const doc of snapshot.docs) {
    const project = doc.data() as Project
    const memberCount = Object.keys(project.members ?? {}).length
    resources.push({
      uri: `projectflow://projects/${doc.id}`,
      name: project.name,
      description: `Project "${project.name}" — ${memberCount} member(s), ${project.cardCounter} card(s)`,
    })
  }

  return resources
}
