import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import {
  listProjectsSchema,
  listProjects,
  getProjectSummarySchema,
  getProjectSummary,
} from "./tools/projects.js"

import {
  listCardsSchema,
  listCards,
  createCardSchema,
  createCard,
  updateCardSchema,
  updateCard,
  moveCardSchema,
  moveCard,
  deleteCardSchema,
  deleteCard,
} from "./tools/cards.js"

import {
  commitAndPushArgsSchema,
  commitAndPushPrompt,
} from "./prompts/commit-and-push.js"

import {
  startTaskArgsSchema,
  startTaskPrompt,
} from "./prompts/start-task.js"

import {
  createBranchArgsSchema,
  createBranchPrompt,
} from "./prompts/create-branch.js"

import {
  projectStatusArgsSchema,
  projectStatusPrompt,
} from "./prompts/project-status.js"

const server = new McpServer({
  name: "projectflow",
  version: "0.1.0",
})

server.registerTool(
  "list_projects",
  {
    title: "List Projects",
    description:
      "List all projects. Optionally filter by userId to show only projects the user is a member of.",
    inputSchema: listProjectsSchema,
  },
  async (params) => {
    const text = await listProjects(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerTool(
  "get_project_summary",
  {
    title: "Get Project Summary",
    description:
      "Get a summary of a project including card counts per status column.",
    inputSchema: getProjectSummarySchema,
  },
  async (params) => {
    const text = await getProjectSummary(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerTool(
  "list_cards",
  {
    title: "List Cards",
    description:
      "List cards in a project. Optionally filter by status (backlog, in_progress, testing, done).",
    inputSchema: listCardsSchema,
  },
  async (params) => {
    const text = await listCards(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerTool(
  "create_card",
  {
    title: "Create Card",
    description:
      "Create a new card in a project. The card will be added to the backlog with an auto-generated ref (e.g., PM-42).",
    inputSchema: createCardSchema,
  },
  async (params) => {
    const text = await createCard(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerTool(
  "update_card",
  {
    title: "Update Card",
    description:
      "Update fields on an existing card. Only provided fields are changed.",
    inputSchema: updateCardSchema,
  },
  async (params) => {
    const text = await updateCard(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerTool(
  "move_card",
  {
    title: "Move Card",
    description:
      "Move a card to a different status column (backlog, in_progress, testing, done).",
    inputSchema: moveCardSchema,
  },
  async (params) => {
    const text = await moveCard(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerTool(
  "delete_card",
  {
    title: "Delete Card",
    description: "Permanently delete a card from a project.",
    inputSchema: deleteCardSchema,
  },
  async (params) => {
    const text = await deleteCard(params)
    return { content: [{ type: "text", text }] }
  }
)

server.registerPrompt(
  "commit_and_push",
  {
    title: "Commit and Push",
    description: "Detecte la tache liee au commit et met a jour le board. Utilise quand un dev commit et push.",
    argsSchema: commitAndPushArgsSchema,
  },
  async (args) => commitAndPushPrompt(args)
)

server.registerPrompt(
  "start_task",
  {
    title: "Start Task",
    description: "Identifie une carte par nom ou ref et la passe en cours. Utilise quand un dev commence a travailler sur une tache.",
    argsSchema: startTaskArgsSchema,
  },
  async (args) => startTaskPrompt(args)
)

server.registerPrompt(
  "create_branch",
  {
    title: "Create Branch",
    description: "Associe une branche Git a une carte ou en cree une nouvelle. Utilise quand un dev cree une branche.",
    argsSchema: createBranchArgsSchema,
  },
  async (args) => createBranchPrompt(args)
)

server.registerPrompt(
  "project_status",
  {
    title: "Project Status",
    description: "Resume l'etat du projet avec le nombre de cartes par colonne.",
    argsSchema: projectStatusArgsSchema,
  },
  async (args) => projectStatusPrompt(args)
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("ProjectFlow MCP server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error)
  process.exit(1)
})
