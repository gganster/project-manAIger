import getAdmin from '@/firebase-admin'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const signUpUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    idToken: z.string(),
    displayName: z.string().min(1),
  }))
  .handler(async ({ data }) => {
    const admin = getAdmin()
    const decodedToken = await admin.auth().verifyIdToken(data.idToken)

    const userRef = admin.firestore().collection('users').doc(decodedToken.uid)
    const existing = await userRef.get()

    if (existing.exists) {
      return { success: true }
    }

    await userRef.set({
      email: decodedToken.email,
      displayName: data.displayName,
      createdAt: new Date(),
    })

    return { success: true }
  })
