import getAdmin from "@/firebase-admin"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { createRepoWebhook } from "@/lib/github"

export const linkRepo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      idToken: z.string(),
      projectId: z.string(),
      owner: z.string(),
      repo: z.string(),
      webhookBaseUrl: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const admin = getAdmin()
    const decoded = await admin.auth().verifyIdToken(data.idToken)
    const db = admin.firestore()

    const projectDoc = await db.collection("projects").doc(data.projectId).get()
    const project = projectDoc.data()
    if (!project || project.members?.[decoded.uid] !== "admin") {
      throw new Error("Not authorized")
    }

    const userDoc = await db.collection("users").doc(decoded.uid).get()
    const userData = userDoc.data()
    if (!userData?.github?.accessToken) {
      throw new Error("GitHub not connected")
    }

    const webhookUrl = `${data.webhookBaseUrl}/api/github/webhook`
    console.log("[linkRepo] Creating webhook:", { owner: data.owner, repo: data.repo, webhookUrl })
    console.log("[linkRepo] Token starts with:", userData.github.accessToken.substring(0, 10))
    let webhookId: number
    try {
      webhookId = await createRepoWebhook(
        userData.github.accessToken,
        data.owner,
        data.repo,
        webhookUrl,
        process.env.GITHUB_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error("[linkRepo] Webhook creation failed:", err)
      throw err
    }

    await db
      .collection("projects")
      .doc(data.projectId)
      .update({
        "settings.github": {
          owner: data.owner,
          repo: data.repo,
          webhookId,
          webhookActive: true,
          connectedBy: decoded.uid,
          connectedAt: new Date(),
        },
        updatedAt: new Date(),
      })

    return { success: true }
  })
