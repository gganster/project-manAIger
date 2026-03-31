import { z } from "zod"
import { db } from "../lib/firebase-admin.js"
import type { AppUser, Project, ProjectRole } from "../lib/types.js"

// ── list_members ──

export const listMembersSchema = {
  projectId: z.string().describe("Project ID"),
}

export async function listMembers(params: {
  projectId: string
}): Promise<string> {
  try {
    const { projectId } = params

    const projectDoc = await db.collection("projects").doc(projectId).get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const project = projectDoc.data() as Project
    const memberEntries = Object.entries(project.members ?? {})

    if (memberEntries.length === 0) {
      return `No members in project ${projectId}.`
    }

    const lines: string[] = [
      `Members of "${project.name}" (${memberEntries.length}):`,
    ]

    for (const [uid, role] of memberEntries) {
      const userDoc = await db.collection("users").doc(uid).get()
      if (userDoc.exists) {
        const user = userDoc.data() as AppUser
        lines.push(
          `- ${user.displayName} (${user.email}) — ${role}${uid === project.ownerId ? " [owner]" : ""}`
        )
      } else {
        lines.push(`- ${uid} — ${role}${uid === project.ownerId ? " [owner]" : ""}`)
      }
    }

    return lines.join("\n")
  } catch (error) {
    return `Error listing members: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── invite_member ──

export const inviteMemberSchema = {
  projectId: z.string().describe("Project ID"),
  email: z.string().describe("Email of the user to invite"),
  role: z
    .enum(["admin", "user"])
    .optional()
    .describe("Role to assign (default: user)"),
}

export async function inviteMember(params: {
  projectId: string
  email: string
  role?: ProjectRole
}): Promise<string> {
  try {
    const { projectId, email, role = "user" } = params

    const projectRef = db.collection("projects").doc(projectId)
    const projectDoc = await projectRef.get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const project = projectDoc.data() as Project

    // Find user by email
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      return `No user found with email: ${email}`
    }

    const userDoc = usersSnapshot.docs[0]
    const user = userDoc.data() as AppUser
    const uid = userDoc.id

    if (project.members?.[uid]) {
      return `User ${user.displayName} (${email}) is already a member of this project.`
    }

    await projectRef.update({
      [`members.${uid}`]: role,
      updatedAt: new Date(),
    })

    return `${user.displayName} (${email}) added as ${role} to project "${project.name}".`
  } catch (error) {
    return `Error inviting member: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ── remove_member ──

export const removeMemberSchema = {
  projectId: z.string().describe("Project ID"),
  userId: z.string().describe("UID of the member to remove"),
}

export async function removeMember(params: {
  projectId: string
  userId: string
}): Promise<string> {
  try {
    const { projectId, userId } = params

    const projectRef = db.collection("projects").doc(projectId)
    const projectDoc = await projectRef.get()
    if (!projectDoc.exists) {
      return `Project not found: ${projectId}`
    }

    const project = projectDoc.data() as Project

    if (!project.members?.[userId]) {
      return `User ${userId} is not a member of this project.`
    }

    if (project.ownerId === userId) {
      return `Cannot remove the project owner (${userId}).`
    }

    const { FieldValue } = await import("firebase-admin/firestore")
    await projectRef.update({
      [`members.${userId}`]: FieldValue.delete(),
      updatedAt: new Date(),
    })

    return `Member ${userId} removed from project "${project.name}".`
  } catch (error) {
    return `Error removing member: ${error instanceof Error ? error.message : String(error)}`
  }
}
