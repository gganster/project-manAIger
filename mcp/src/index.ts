import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

// Tools — Projects
import {
  listProjectsSchema, listProjects,
  getProjectSchema, getProject,
  getProjectSummarySchema, getProjectSummary,
  createProjectSchema, createProject,
  updateProjectSchema, updateProject,
  deleteProjectSchema, deleteProject,
} from "./tools/projects.js"

// Tools — Cards
import {
  listCardsSchema, listCards,
  getCardSchema, getCard,
  createCardSchema, createCard,
  updateCardSchema, updateCard,
  moveCardSchema, moveCard,
  deleteCardSchema, deleteCard,
} from "./tools/cards.js"

// Tools — Members
import {
  listMembersSchema, listMembers,
  inviteMemberSchema, inviteMember,
  removeMemberSchema, removeMember,
} from "./tools/members.js"

// Resources
import {
  readProject, readBoard, listProjectResources,
} from "./resources/projects.js"

// Prompts
import { commitAndPushArgsSchema, commitAndPushPrompt } from "./prompts/commit-and-push.js"
import { startTaskArgsSchema, startTaskPrompt } from "./prompts/start-task.js"
import { createBranchArgsSchema, createBranchPrompt } from "./prompts/create-branch.js"
import { projectStatusArgsSchema, projectStatusPrompt } from "./prompts/project-status.js"

const server = new McpServer({
  name: "projectflow",
  version: "1.0.0",
})

// ════════════════════════════════════════
// TOOLS — Projects
// ════════════════════════════════════════

server.registerTool("list_projects", {
  title: "List Projects",
  description: "List all projects. Optionally filter by userId to show only projects the user is a member of.",
  inputSchema: listProjectsSchema,
}, async (params) => {
  const text = await listProjects(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("get_project", {
  title: "Get Project",
  description: "Get full details of a project including members and settings.",
  inputSchema: getProjectSchema,
}, async (params) => {
  const text = await getProject(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("get_project_summary", {
  title: "Get Project Summary",
  description: "Get a summary of a project including card counts per status column.",
  inputSchema: getProjectSummarySchema,
}, async (params) => {
  const text = await getProjectSummary(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("create_project", {
  title: "Create Project",
  description: "Create a new project. The creator becomes the owner and first admin member.",
  inputSchema: createProjectSchema,
}, async (params) => {
  const text = await createProject(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("update_project", {
  title: "Update Project",
  description: "Update project fields (name).",
  inputSchema: updateProjectSchema,
}, async (params) => {
  const text = await updateProject(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("delete_project", {
  title: "Delete Project",
  description: "Delete a project and all its cards permanently.",
  inputSchema: deleteProjectSchema,
}, async (params) => {
  const text = await deleteProject(params)
  return { content: [{ type: "text", text }] }
})

// ════════════════════════════════════════
// TOOLS — Cards
// ════════════════════════════════════════

server.registerTool("list_cards", {
  title: "List Cards",
  description: "List cards in a project. Optionally filter by status (backlog, in_progress, testing, done).",
  inputSchema: listCardsSchema,
}, async (params) => {
  const text = await listCards(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("get_card", {
  title: "Get Card",
  description: "Get full details of a single card by ID.",
  inputSchema: getCardSchema,
}, async (params) => {
  const text = await getCard(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("create_card", {
  title: "Create Card",
  description: "Create a new card in a project. The card will be added to the backlog with an auto-generated ref (e.g., PM-42).",
  inputSchema: createCardSchema,
}, async (params) => {
  const text = await createCard(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("update_card", {
  title: "Update Card",
  description: "Update fields on an existing card. Only provided fields are changed. Supports title, description, priority, status, assigneeId, gitBranch.",
  inputSchema: updateCardSchema,
}, async (params) => {
  const text = await updateCard(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("move_card", {
  title: "Move Card",
  description: "Move a card to a different status column (backlog, in_progress, testing, done).",
  inputSchema: moveCardSchema,
}, async (params) => {
  const text = await moveCard(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("delete_card", {
  title: "Delete Card",
  description: "Permanently delete a card from a project.",
  inputSchema: deleteCardSchema,
}, async (params) => {
  const text = await deleteCard(params)
  return { content: [{ type: "text", text }] }
})

// ════════════════════════════════════════
// TOOLS — Members
// ════════════════════════════════════════

server.registerTool("list_members", {
  title: "List Members",
  description: "List all members of a project with their roles and user details.",
  inputSchema: listMembersSchema,
}, async (params) => {
  const text = await listMembers(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("invite_member", {
  title: "Invite Member",
  description: "Add an existing user to a project by email. Assigns a role (admin or user).",
  inputSchema: inviteMemberSchema,
}, async (params) => {
  const text = await inviteMember(params)
  return { content: [{ type: "text", text }] }
})

server.registerTool("remove_member", {
  title: "Remove Member",
  description: "Remove a member from a project. Cannot remove the project owner.",
  inputSchema: removeMemberSchema,
}, async (params) => {
  const text = await removeMember(params)
  return { content: [{ type: "text", text }] }
})

// ════════════════════════════════════════
// RESOURCES
// ════════════════════════════════════════

server.registerResource(
  "project-details",
  new ResourceTemplate("projectflow://projects/{projectId}", {
    list: async () => {
      const resources = await listProjectResources()
      return { resources }
    },
  }),
  {
    title: "Project Details",
    description: "Full project details including members with user info",
    mimeType: "application/json",
  },
  async (uri, { projectId }) => ({
    contents: [{
      uri: uri.href,
      text: await readProject(projectId as string),
    }],
  })
)

server.registerResource(
  "project-board",
  new ResourceTemplate("projectflow://projects/{projectId}/board", {
    list: undefined,
  }),
  {
    title: "Project Board",
    description: "Full kanban board state with cards grouped by status columns",
    mimeType: "application/json",
  },
  async (uri, { projectId }) => ({
    contents: [{
      uri: uri.href,
      text: await readBoard(projectId as string),
    }],
  })
)

// ════════════════════════════════════════
// PROMPTS
// ════════════════════════════════════════

server.registerPrompt("commit_and_push", {
  title: "Commit and Push",
  description: "Detecte la tache liee au commit et met a jour le board. Utilise quand un dev commit et push.",
  argsSchema: commitAndPushArgsSchema,
}, async (args) => commitAndPushPrompt(args))

server.registerPrompt("start_task", {
  title: "Start Task",
  description: "Identifie une carte par nom ou ref et la passe en cours. Utilise quand un dev commence a travailler sur une tache.",
  argsSchema: startTaskArgsSchema,
}, async (args) => startTaskPrompt(args))

server.registerPrompt("create_branch", {
  title: "Create Branch",
  description: "Associe une branche Git a une carte ou en cree une nouvelle. Utilise quand un dev cree une branche.",
  argsSchema: createBranchArgsSchema,
}, async (args) => createBranchPrompt(args))

server.registerPrompt("project_status", {
  title: "Project Status",
  description: "Resume l'etat du projet avec le nombre de cartes par colonne.",
  argsSchema: projectStatusArgsSchema,
}, async (args) => projectStatusPrompt(args))

// ════════════════════════════════════════
// START
// ════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("ProjectFlow MCP server v1.0.0 running on stdio")
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error)
  process.exit(1)
})
