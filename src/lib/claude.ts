import Anthropic from "@anthropic-ai/sdk"
import type { Card } from "@/lib/types"

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
  }
  return client
}

export async function matchBranchToCard(branchName: string, cards: Card[]): Promise<string | null> {
  if (cards.length === 0) return null

  const refMatch = branchName.match(/PM-(\d+)/i)
  if (refMatch) {
    const ref = `PM-${refMatch[1]}`
    const card = cards.find((c) => c.ref.toUpperCase() === ref.toUpperCase())
    if (card) return card.ref
  }

  const anthropic = getClient()
  const cardList = cards
    .filter((c) => c.status !== "done")
    .map((c) => `- ${c.ref}: ${c.title}`)
    .join("\n")

  if (!cardList) return null

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    system:
      "Tu reçois un nom de branche Git et une liste de tâches. Trouve la tâche qui correspond le mieux à cette branche. Réponds UNIQUEMENT avec la ref de la tâche (ex: PM-12) ou null si aucune ne correspond. Pas d'explication.",
    messages: [
      {
        role: "user",
        content: `Branche: ${branchName}\n\nTâches:\n${cardList}`,
      },
    ],
  })

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const match = text.match(/^PM-\d+$/i)
  if (match) {
    const card = cards.find((c) => c.ref.toUpperCase() === match[0].toUpperCase())
    if (card) return card.ref
  }

  return null
}
