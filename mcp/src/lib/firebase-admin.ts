import admin from "firebase-admin"
import type { ServiceAccount } from "firebase-admin"

const strip = (s: string) => s.replace(/^["']+|["',]+$/g, "").trim()

const getFirebaseApp = (): admin.app.App => {
  if (admin.apps.length) return admin.apps[0] as admin.app.App

  const projectId =
    process.env.FIREB_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID
  const clientEmail =
    process.env.FIREB_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL
  const privateKey =
    process.env.FIREB_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREB_PROJECT_ID, FIREB_CLIENT_EMAIL, and FIREB_PRIVATE_KEY."
    )
  }

  const firebaseConfig: ServiceAccount = {
    projectId: strip(projectId),
    clientEmail: strip(clientEmail),
    privateKey: strip(privateKey).replace(/\\n/g, "\n"),
  }

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  })

  return admin.apps[0] as admin.app.App
}

getFirebaseApp()

export const db = admin.firestore()
