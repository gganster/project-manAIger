import { z } from "zod"
import { findCardByText } from "../lib/matching.js"
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js"

export const startTaskArgsSchema = {
  projectId: z.string().describe("Project ID"),
  task: z.string().describe("Task identifier: ref like PM-3, or partial title like 'login'"),
}

export async function startTaskPrompt(args: {
  projectId: string
  task: string
}): Promise<GetPromptResult> {
  const { projectId, task } = args

  const { card, confidence } = await findCardByText(projectId, task)

  let text: string

  if (card && confidence !== "none") {
    const matchInfo = confidence === "exact"
      ? `Card ${card.ref} found by reference.`
      : `Card ${card.ref} found by title match (fuzzy).`

    text = [
      "You are a project board assistant. A developer is starting to work on a task.",
      `Project ID: ${projectId}`,
      `Task identifier provided: ${task}`,
      "",
      matchInfo,
      `Card found: ${card.ref} — "${card.title}" (current status: ${card.status}, card ID: ${card.id})`,
      "",
      `Call move_card with projectId="${projectId}", cardId="${card.id}", status="in_progress" to mark this task as in progress.`,
      `After moving the card, confirm to the user that ${card.ref} ("${card.title}") has been moved to in_progress.`,
    ].join("\n")
  } else {
    text = [
      "You are a project board assistant. A developer is starting to work on a task.",
      `Project ID: ${projectId}`,
      `Task identifier provided: ${task}`,
      "",
      `No card was found matching "${task}" in project ${projectId}.`,
      `Inform the user that no card was found.`,
      `Suggest using list_cards to see available cards, or use create_card to create a new card for this task.`,
    ].join("\n")
  }

  return {
    messages: [
      {
        role: "user",
        content: { type: "text", text },
      },
    ],
  }
}
