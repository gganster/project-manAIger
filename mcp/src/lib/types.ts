export type CardStatus = "backlog" | "in_progress" | "testing" | "done"
export type CardPriority = "low" | "medium" | "high" | "urgent"
export type ProjectRole = "admin" | "user"

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
    github?: {
      repo: string
      owner: string
      webhookId?: number
      webhookActive?: boolean
      connectedBy?: string
      connectedAt?: Date
    }
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
