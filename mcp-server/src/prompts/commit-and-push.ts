import { z } from "zod"
import { findCardByText } from "../lib/matching.js"
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js"

export const commitAndPushArgsSchema = {
  projectId: z.string().describe("Project ID"),
  message: z.string().describe("Commit message or description of what was done"),
  branch: z.string().optional().describe("Branch name"),
  mergedToMain: z.string().optional().describe("Set to 'true' if merged to main/master"),
}

export async function commitAndPushPrompt(args: {
  projectId: string
  message: string
  branch?: string
  mergedToMain?: string
}): Promise<GetPromptResult> {
  const { projectId, message, branch, mergedToMain } = args
  const isMerged = mergedToMain === "true"

  const searchText = branch ? `${message} ${branch}` : message
  const { card, confidence } = await findCardByText(projectId, searchText)

  let systemMessage: string
  let userMessage: string

  if (card && confidence !== "none") {
    const targetStatus = isMerged ? "done" : "testing"
    const statusLabel = isMerged ? "done (merged to main)" : "testing (pushed, ready to test)"
    const matchInfo = confidence === "exact"
      ? `Card ${card.ref} found by reference.`
      : `Card ${card.ref} found by title match (fuzzy).`

    systemMessage = [
      "You are a project board assistant. A developer has just committed and pushed code.",
      `Project ID: ${projectId}`,
      `Commit/action: ${message}`,
      branch ? `Branch: ${branch}` : "",
      `Merged to main: ${isMerged ? "yes" : "no"}`,
      "",
      matchInfo,
      `Card found: ${card.ref} — "${card.title}" (current status: ${card.status}, card ID: ${card.id})`,
      `Target status: ${statusLabel}`,
    ].filter(Boolean).join("\n")

    userMessage = [
      `The developer committed and pushed: "${message}".`,
      `Card ${card.ref} ("${card.title}") was identified as the related task.`,
      `Call move_card with projectId="${projectId}", cardId="${card.id}", status="${targetStatus}" to update the board.`,
      `After moving the card, confirm to the user that ${card.ref} has been moved to ${targetStatus}.`,
    ].join("\n")
  } else {
    systemMessage = [
      "You are a project board assistant. A developer has just committed and pushed code.",
      `Project ID: ${projectId}`,
      `Commit/action: ${message}`,
      branch ? `Branch: ${branch}` : "",
      "No matching card was found for this commit.",
    ].filter(Boolean).join("\n")

    userMessage = [
      `The developer committed and pushed: "${message}".`,
      "No card was found matching this commit message or branch name.",
      `Inform the user that no card was found in project ${projectId}.`,
      `Suggest using create_card to create a new card for this work, or using start_task with a ref like PM-X to link to an existing card.`,
    ].join("\n")
  }

  return {
    messages: [
      {
        role: "user",
        content: { type: "text", text: `${systemMessage}\n\n${userMessage}` },
      },
    ],
  }
}
