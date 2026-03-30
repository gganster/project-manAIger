import {
  doc, collection, getDoc, getCollectionQuery,
  onCollection,
  addDoc, updateDoc, deleteDoc,
  query, where, Timestamp,
} from "@/firebase"
import type { Project, AppUser } from "@/lib/types"

// ---- Users ----
export const getUser = (uid: string) => getDoc<AppUser>("users", uid)

// ---- Projects ----
export const getProject = (projectId: string) => getDoc<Project>("projects", projectId)

export const getUserProjects = (userId: string, callback: (projects: Project[]) => void) => {
  const ref = collection("projects")
  return onCollection<Project>(ref, (projects: Project[]) => {
    callback(projects.filter((p: Project) => p.members && p.members[userId]))
  })
}

export const createProject = async (name: string, userId: string): Promise<string> => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const ref = await addDoc(collection("projects"), {
    name,
    slug,
    ownerId: userId,
    members: { [userId]: "admin" },
    cardCounter: 0,
    settings: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export const updateProject = (projectId: string, data: Partial<Project>) =>
  updateDoc(doc("projects", projectId), { ...data, updatedAt: Timestamp.now() })

export const deleteProject = (projectId: string) => deleteDoc(doc("projects", projectId))

export const inviteMember = async (projectId: string, email: string, role: "admin" | "user") => {
  const users = await getCollectionQuery<AppUser>(
    query(collection("users"), where("email", "==", email))
  )
  if (users.length === 0) throw new Error("Aucun utilisateur trouvé avec cet email")
  const user = users[0]
  const project = await getProject(projectId)
  if (!project) throw new Error("Projet non trouvé")
  if (project.members[user.uid]) throw new Error("Cet utilisateur est déjà membre")
  await updateDoc(doc("projects", projectId), {
    [`members.${user.uid}`]: role,
    updatedAt: Timestamp.now(),
  })
  return user
}

export const removeMember = (projectId: string, uid: string) =>
  updateDoc(doc("projects", projectId), {
    [`members.${uid}`]: null as any,
    updatedAt: Timestamp.now(),
  })
