export type CardStatus = "backlog" | "in_progress" | "testing" | "done"
export type CardPriority = "low" | "medium" | "high" | "urgent"
export type ProjectRole = "admin" | "user"

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  backlog: "Backlog",
  in_progress: "En cours",
  testing: "À tester",
  done: "Fini",
}

export const CARD_PRIORITY_LABELS: Record<CardPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
}

export const CARD_STATUS_ORDER: CardStatus[] = ["backlog", "in_progress", "testing", "done"]

export interface Card {
  id: string
  title: string
  description: string
  status: CardStatus
  priority: CardPriority
  assigneeId?: string
  deadline?: Date
  order: number
  ref: string
  gitBranch?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface Project {
  id: string
  name: string
  slug: string
  ownerId: string
  members: Record<string, ProjectRole>
  cardCounter: number
  settings: {
    github?: { repo: string; owner: string }
  }
  createdAt: Date
  updatedAt: Date
}

export interface AppUser {
  uid: string
  email: string
  displayName: string
  createdAt: Date
}

export interface Invite {
  uid: string
  email: string
  role: ProjectRole
  createdAt: Date
}
