import { createFileRoute } from "@tanstack/react-router"
import { verifyWebhookSignature, getCommitParents, getBranchesForCommit } from "@/lib/github"
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
        console.log("[webhook]", event, event === "push" ? payload.ref : "")

        if (event === "create" && payload.ref_type === "branch") {
          await handleBranchCreated(payload)
        } else if (event === "push") {
          await handlePush(payload)
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

function extractMergedBranch(commits: { message: string }[]): string | null {
  for (const commit of commits) {
    const m = commit.message
    const match = m.match(/^Merge branch '([^']+)'/)
      || m.match(/^Merge branch "([^"]+)"/)
      || m.match(/^Merge remote-tracking branch '(?:origin\/)?([^']+)'/)
      || m.match(/^Merge pull request .+ from (?:[^/]+\/)?(.+)/)
    if (match) return match[1]
  }
  return null
}

async function handlePush(payload: {
  ref: string
  commits?: { message: string }[]
  repository: { owner: { login: string }; name: string }
}) {
  const targetBranch = payload.ref.replace("refs/heads/", "")
  const commits = payload.commits || []

  if (targetBranch !== "dev" && targetBranch !== "main") return

  const mergedBranch = extractMergedBranch(commits)
  if (!mergedBranch) return

  console.log("[webhook] Merge detected:", mergedBranch, "→", targetBranch)

  const owner = payload.repository.owner.login
  const repo = payload.repository.name

  const project = await findProjectByRepo(owner, repo)
  if (!project) return

  const admin = getAdmin()
  const db = admin.firestore()
  const cardsRef = db.collection("projects").doc(project.id).collection("cards")

  if (targetBranch === "dev") {
    if (mergedBranch === "main") return
    const snapshot = await cardsRef.where("gitBranch", "==", mergedBranch).limit(1).get()
    for (const doc of snapshot.docs) {
      console.log("[webhook] Card", doc.data().ref, "→ testing")
      await doc.ref.update({ status: "testing", updatedAt: new Date() })
    }
  } else if (targetBranch === "main") {
    if (mergedBranch === "dev") {
      const snapshot = await cardsRef.where("status", "==", "testing").get()
      const batch = db.batch()
      for (const doc of snapshot.docs) {
        console.log("[webhook] Card", doc.data().ref, "→ done (dev→main)")
        batch.update(doc.ref, { status: "done", updatedAt: new Date() })
      }
      await batch.commit()
    } else {
      const snapshot = await cardsRef.where("gitBranch", "==", mergedBranch).limit(1).get()
      for (const doc of snapshot.docs) {
        console.log("[webhook] Card", doc.data().ref, "→ done")
        await doc.ref.update({ status: "done", updatedAt: new Date() })
      }
    }
  }
}
