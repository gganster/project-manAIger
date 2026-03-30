import { db } from "./firebase-admin.js"
import type { Card } from "./types.js"

export interface RefMatch {
  ref: string
  number: number
}

export interface CardMatch {
  card: Card | null
  confidence: "exact" | "fuzzy" | "none"
}

export interface BranchParsed {
  type: string
  ref?: string
  slug: string
}

export function matchByRef(text: string): RefMatch | null {
  const match = text.match(/PM-(\d+)/i)
  if (!match) return null
  return {
    ref: `PM-${match[1]}`,
    number: parseInt(match[1], 10),
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractSignificantWords(text: string): string[] {
  const stopWords = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "en",
    "au", "aux", "par", "pour", "sur", "dans", "avec", "sans", "sous",
    "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "by",
    "je", "il", "elle", "nous", "vous", "ils", "elles", "ce", "se", "ma",
    "ta", "sa", "mon", "ton", "son", "mes", "tes", "ses", "nos", "vos",
  ])
  return slugify(text)
    .split(" ")
    .filter((w) => w.length > 2 && !stopWords.has(w))
}

export function matchByTitle(text: string, cards: Card[]): Card | null {
  const normalizedText = slugify(text)
  const textWords = extractSignificantWords(text)

  let bestCard: Card | null = null
  let bestScore = 0

  for (const card of cards) {
    const cardSlug = slugify(card.title)
    const cardWords = extractSignificantWords(card.title)

    // Check if the full card title slug appears in the text
    if (normalizedText.includes(cardSlug)) {
      const score = cardSlug.length
      if (score > bestScore) {
        bestScore = score
        bestCard = card
      }
      continue
    }

    // Count matching significant words
    let matchCount = 0
    for (const word of cardWords) {
      if (textWords.includes(word) || normalizedText.includes(word)) {
        matchCount++
      }
    }

    if (cardWords.length > 0) {
      const matchRatio = matchCount / cardWords.length
      // Require at least 50% of card words to match
      if (matchRatio >= 0.5 && matchCount > bestScore) {
        bestScore = matchCount
        bestCard = card
      }
    }
  }

  return bestCard
}

export async function findCardByRef(
  projectId: string,
  ref: string
): Promise<Card | null> {
  const snapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("cards")
    .where("ref", "==", ref)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Card
}

export async function findCardByText(
  projectId: string,
  text: string
): Promise<CardMatch> {
  const refMatch = matchByRef(text)

  if (refMatch) {
    const card = await findCardByRef(projectId, refMatch.ref)
    if (card) {
      return { card, confidence: "exact" }
    }
  }

  // Fall back to title matching
  const snapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("cards")
    .get()

  if (snapshot.empty) return { card: null, confidence: "none" }

  const cards: Card[] = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Card
  )

  const card = matchByTitle(text, cards)
  return {
    card,
    confidence: card ? "fuzzy" : "none",
  }
}

export function parseBranchName(branch: string): BranchParsed {
  // Remove remote prefix if present (e.g., origin/)
  const cleanBranch = branch.replace(/^[^/]+\//, "")

  // Common branch type prefixes
  const typePattern = /^(feat|feature|fix|bugfix|hotfix|chore|refactor|docs|test|ci|style|perf|build|release)\//i
  const typeMatch = cleanBranch.match(typePattern)

  let type = "feature"
  let rest = cleanBranch

  if (typeMatch) {
    type = typeMatch[1].toLowerCase()
    rest = cleanBranch.slice(typeMatch[0].length)
  }

  const refMatch = matchByRef(rest)
  const ref = refMatch?.ref

  // Remove the ref part from slug if present
  const slug = ref
    ? rest.replace(/PM-\d+-?/i, "").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : rest

  return { type, ref, slug }
}
