import getAdmin from "@/firebase-admin";
import { createServerFn } from '@tanstack/react-start'
import * as z from 'zod'

export const helloWorldSchema = z.object({
  message: z.string().min(1).max(100),
  idToken: z.string()
})

export const helloWorldDemoAction = createServerFn({method: "POST"})
  .inputValidator(helloWorldSchema)
  .handler(async ({data}: {data: z.infer<typeof helloWorldSchema>}) => {
    const admin = getAdmin();
    const decodedToken = await admin.auth().verifyIdToken(data.idToken);

    const user = await admin.auth().getUser(decodedToken.uid);
    const userData = (await admin.firestore().collection("users").doc(user.uid).get())?.data();
    if (!userData) {
      throw new Error("User not found");
    }

    return {
      message: `Hello ${userData.name}!`,
    }
  })