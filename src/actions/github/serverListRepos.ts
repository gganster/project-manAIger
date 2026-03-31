import getAdmin from "@/firebase-admin"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { listUserRepos } from "@/lib/github"

export const listRepos = createServerFn({ method: "POST" })
  .inputValidator(z.object({ idToken: z.string() }))
  .handler(async ({ data }) => {
    const admin = getAdmin()
    const decoded = await admin.auth().verifyIdToken(data.idToken)

    const userDoc = await admin.firestore().collection("users").doc(decoded.uid).get()
    const userData = userDoc.data()

    if (!userData?.github?.accessToken) {
      throw new Error("GitHub not connected")
    }

    const repos = await listUserRepos(userData.github.accessToken)
    return { repos }
  })
