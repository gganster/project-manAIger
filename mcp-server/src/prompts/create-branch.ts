import { z } from "zod"
import { parseBranchName, findCardByText } from "../lib/matching.js"
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js"

export const createBranchArgsSchema = {
  projectId: z.string().describe("Project ID"),
  branch: z.string().describe("Branch name (e.g., feat/PM-12-login or fix/crash)"),
}

export async function createBranchPrompt(args: {
  projectId: string
  branch: string
}): Promise<GetPromptResult> {
  const { projectId, branch } = args

  const parsed = parseBranchName(branch)
  const searchText = parsed.ref ? `${parsed.ref} ${parsed.slug}` : parsed.slug

  const { card, confidence } = await findCardByText(projectId, searchText)

  let text: string

  if (card && confidence !== "none") {
    const matchInfo = confidence === "exact"
      ? `Card ${card.ref} found by reference.`
      : `Card ${card.ref} found by title match (fuzzy).`

    text = [
      "You are a project board assistant. A developer has created a new Git branch.",
      `Project ID: ${projectId}`,
      `Branch: ${branch}`,
      `Parsed — type: ${parsed.type}, slug: ${parsed.slug}${parsed.ref ? `, ref: ${parsed.ref}` : ""}`,
      "",
      matchInfo,
      `Card found: ${card.ref} — "${card.title}" (current status: ${card.status}, card ID: ${card.id})`,
      "",
      `Perform the following steps in order:`,
      `1. Call move_card with projectId="${projectId}", cardId="${card.id}", status="in_progress" to move the card to in_progress.`,
      `2. Call update_card with projectId="${projectId}", cardId="${card.id}" and set the gitBranch field to "${branch}".`,
      `After completing both steps, confirm to the user that ${card.ref} is now in_progress and linked to branch "${branch}".`,
    ].join("\n")
  } else {
    const titleFromSlug = parsed.slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())

    text = [
      "You are a project board assistant. A developer has created a new Git branch.",
      `Project ID: ${projectId}`,
      `Branch: ${branch}`,
      `Parsed — type: ${parsed.type}, slug: ${parsed.slug}${parsed.ref ? `, ref: ${parsed.ref}` : ""}`,
      "",
      `No existing card was found matching this branch.`,
      `Create a new card using create_card with:`,
      `  - projectId: "${projectId}"`,
      `  - title: "${titleFromSlug}"`,
      `  - description: "Created from branch: ${branch}"`,
      `After creating the card, move it to in_progress using move_card.`,
      `Then update the card with update_card to set gitBranch to "${branch}".`,
      `Confirm to the user that a new card has been created and is now in_progress linked to branch "${branch}".`,
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
