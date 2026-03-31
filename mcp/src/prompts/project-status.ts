import { z } from "zod"
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js"

export const projectStatusArgsSchema = {
  projectId: z.string().describe("Project ID"),
}

export async function projectStatusPrompt(args: {
  projectId: string
}): Promise<GetPromptResult> {
  const { projectId } = args

  const text = [
    "You are a project board assistant. The user wants a status overview of their project.",
    `Project ID: ${projectId}`,
    "",
    `Call get_project_summary with projectId="${projectId}".`,
    `Present the results to the user in a clear, readable format showing:`,
    `- The project name`,
    `- Total number of cards`,
    `- Number of cards per column (Backlog, In Progress, Testing, Done)`,
    `- The list of card refs in each column`,
    `Keep the response concise and easy to scan.`,
  ].join("\n")

  return {
    messages: [
      {
        role: "user",
        content: { type: "text", text },
      },
    ],
  }
}
