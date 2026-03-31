import getAdmin from "@/firebase-admin"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { deleteRepoWebhook } from "@/lib/github"
import { FieldValue } from "firebase-admin/firestore"

export const unlinkRepo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ idToken: z.string(), projectId: z.string() }))
  .handler(async ({ data }) => {
    const admin = getAdmin()
    const decoded = await admin.auth().verifyIdToken(data.idToken)
    const db = admin.firestore()

    const projectDoc = await db.collection("projects").doc(data.projectId).get()
    const project = projectDoc.data()
    if (!project || project.members?.[decoded.uid] !== "admin") {
      throw new Error("Not authorized")
    }

    const github = project.settings?.github
    if (github?.webhookId && github.connectedBy) {
      const userDoc = await db.collection("users").doc(github.connectedBy).get()
      const userData = userDoc.data()
      if (userData?.github?.accessToken) {
        await deleteRepoWebhook(userData.github.accessToken, github.owner, github.repo, github.webhookId).catch(
          () => {}
        )
      }
    }

    await db.collection("projects").doc(data.projectId).update({
      "settings.github": FieldValue.delete(),
      updatedAt: new Date(),
    })

    return { success: true }
  })
