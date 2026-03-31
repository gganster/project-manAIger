import { createFileRoute } from "@tanstack/react-router"
import { verifyWebhookSignature } from "@/lib/github"
import { matchBranchToCard } from "@/lib/claude"
import getAdmin from "@/firebase-admin"
import type { Card } from "@/lib/types"

export const Route = createFileRoute("/api/github/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text()
        const signature = request.headers.get("x-hub-signature-256")
        const event = request.headers.get("x-github-event")

        if (!signature || !verifyWebhookSignature(body, signature, process.env.GITHUB_WEBHOOK_SECRET!)) {
          return new Response("Invalid signature", { status: 401 })
        }

        const payload = JSON.parse(body)

        if (event === "create" && payload.ref_type === "branch") {
          await handleBranchCreated(payload)
        } else if (event === "pull_request" && payload.action === "closed" && payload.pull_request?.merged) {
          await handlePRMerged(payload)
        }

        return Response.json({ ok: true })
      },
    },
  },
})

async function findProjectByRepo(owner: string, repo: string) {
  const admin = getAdmin()
  const snapshot = await admin
    .firestore()
    .collection("projects")
    .where("settings.github.owner", "==", owner)
    .where("settings.github.repo", "==", repo)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

async function getProjectCards(projectId: string): Promise<Card[]> {
  const admin = getAdmin()
  const snapshot = await admin.firestore().collection("projects").doc(projectId).collection("cards").get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Card)
}

async function handleBranchCreated(payload: { ref: string; repository: { owner: { login: string }; name: string } }) {
  const branchName = payload.ref
  const owner = payload.repository.owner.login
  const repo = payload.repository.name

  const project = await findProjectByRepo(owner, repo)
  if (!project) return

  const cards = await getProjectCards(project.id)
  const matchedRef = await matchBranchToCard(branchName, cards)

  const admin = getAdmin()
  const db = admin.firestore()

  if (matchedRef) {
    const card = cards.find((c) => c.ref === matchedRef)
    if (card) {
      await db
        .collection("projects")
        .doc(project.id)
        .collection("cards")
        .doc(card.id)
        .update({ gitBranch: branchName, status: "in_progress", updatedAt: new Date() })
    }
  } else {
    const projectDoc = await db.collection("projects").doc(project.id).get()
    const projectData = projectDoc.data()
    const counter = (projectData?.cardCounter || 0) + 1
    const ref = `PM-${counter}`

    const title = branchName
      .replace(/^(feature|feat|fix|bugfix|hotfix|chore|refactor)\//i, "")
      .replace(/[-_]/g, " ")
      .trim()

    await db
      .collection("projects")
      .doc(project.id)
      .collection("cards")
      .add({
        title: title || branchName,
        description: "",
        status: "in_progress",
        priority: "medium",
        order: Date.now(),
        ref,
        gitBranch: branchName,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "github-webhook",
      })

    await db
      .collection("projects")
      .doc(project.id)
      .update({ cardCounter: counter })
  }
}

async function handlePRMerged(payload: {
  pull_request: { head: { ref: string }; base: { ref: string } }
  repository: { owner: { login: string }; name: string }
}) {
  const headRef = payload.pull_request.head.ref
  const baseRef = payload.pull_request.base.ref
  const owner = payload.repository.owner.login
  const repo = payload.repository.name

  const project = await findProjectByRepo(owner, repo)
  if (!project) return

  const admin = getAdmin()
  const db = admin.firestore()
  const cardsRef = db.collection("projects").doc(project.id).collection("cards")

  if (baseRef === "dev") {
    const snapshot = await cardsRef.where("gitBranch", "==", headRef).limit(1).get()
    for (const doc of snapshot.docs) {
      await doc.ref.update({ status: "testing", updatedAt: new Date() })
    }
  } else if (baseRef === "main" && headRef !== "dev") {
    const snapshot = await cardsRef.where("gitBranch", "==", headRef).limit(1).get()
    for (const doc of snapshot.docs) {
      await doc.ref.update({ status: "done", updatedAt: new Date() })
    }
  } else if (baseRef === "main" && headRef === "dev") {
    const snapshot = await cardsRef.where("status", "==", "testing").get()
    const batch = db.batch()
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { status: "done", updatedAt: new Date() })
    }
    await batch.commit()
  }
}
