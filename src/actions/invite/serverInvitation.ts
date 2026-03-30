import getAdmin from '@/firebase-admin'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import sendEmail from '@/actions/lib/sendEmail'
import type { Invite, Project, AppUser } from '@/lib/types'
import { Timestamp } from 'firebase-admin/firestore'

function toPlain<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value instanceof Timestamp ? value.toDate().toISOString() : value
  }
  return result as T
}

export const inviteMember = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    idToken: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'user']),
    projectId: z.string(),
  }))
  .handler(async ({ data }) => {
    const admin = getAdmin()
    const { email, role, projectId } = data
    const decodedToken = await admin.auth().verifyIdToken(data.idToken)

    const projectDoc = await admin.firestore().collection('projects').doc(projectId).get()
    if (!projectDoc.exists) throw new Error('Projet non trouvé')
    const project = { id: projectId, ...projectDoc.data() } as Project

    const callerRole = project.members[decodedToken.uid]
    if (callerRole !== 'admin') throw new Error("Vous n'avez pas les permissions pour inviter des membres")

    const existingInvites = await admin.firestore()
      .collection('projects')
      .doc(projectId)
      .collection('invites')
      .where('email', '==', email)
      .get()

    if (!existingInvites.empty) {
      throw new Error('Une invitation a déjà été envoyée à cet email')
    }

    const memberUids = Object.entries(project.members).filter(([, role]) => role != null).map(([uid]) => uid)
    const memberDocs = await Promise.all(
      memberUids.map(uid => admin.firestore().collection('users').doc(uid).get())
    )
    const memberEmails = memberDocs
      .filter(d => d.exists)
      .map(d => (d.data() as AppUser).email)

    if (memberEmails.includes(email)) {
      throw new Error("L'utilisateur est déjà membre du projet")
    }

    const inviteToken = uuidv4()

    await sendEmail({
      to: email,
      subject: `Invitation à rejoindre ${project.name}`,
      html: `<p>Vous avez été invité à rejoindre le projet <strong>${project.name}</strong> sur ProjectFlow.</p>
      <a href="${process.env.API_DOMAIN}/accept-invite?token=${inviteToken}&projectId=${projectId}">Accepter l'invitation</a>`,
    })

    await admin.firestore()
      .collection('projects')
      .doc(projectId)
      .collection('invites')
      .doc(inviteToken)
      .set({ email, role, createdAt: new Date() })

    return { message: 'Invitation envoyée avec succès' }
  })

export const validateInvite = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    token: z.string(),
    projectId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { token, projectId } = data
    const admin = getAdmin()

    try {
      const inviteDoc = await admin.firestore()
        .collection('projects')
        .doc(projectId)
        .collection('invites')
        .doc(token)
        .get()

      if (!inviteDoc.exists) {
        return { valid: false as const, error: 'Invitation invalide ou expirée' }
      }

      const invite = toPlain<Invite>({ uid: token, ...inviteDoc.data()! })

      const projectDoc = await admin.firestore()
        .collection('projects')
        .doc(projectId)
        .get()

      if (!projectDoc.exists) {
        return { valid: false as const, error: 'Projet introuvable' }
      }

      const project = toPlain<Project>({ id: projectId, ...projectDoc.data()! })

      return { valid: true as const, invite, project }
    } catch {
      return { valid: false as const, error: 'Erreur lors de la validation' }
    }
  })

export const acceptInvite = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    idToken: z.string(),
    token: z.string(),
    projectId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { idToken, token, projectId } = data
    const admin = getAdmin()

    const decodedToken = await admin.auth().verifyIdToken(idToken)

    const inviteDoc = await admin.firestore()
      .collection('projects')
      .doc(projectId)
      .collection('invites')
      .doc(token)
      .get()

    if (!inviteDoc.exists) {
      throw new Error('Invitation invalide ou expirée')
    }

    const invite = toPlain<Invite>({ uid: token, ...inviteDoc.data()! })

    if (invite.email !== decodedToken.email) {
      throw new Error("Cette invitation n'est pas destinée à votre adresse email")
    }

    const projectDoc = await admin.firestore()
      .collection('projects')
      .doc(projectId)
      .get()

    if (!projectDoc.exists) {
      throw new Error('Projet introuvable')
    }

    const project = toPlain<Project>({ id: projectId, ...projectDoc.data()! })

    if (project.members[decodedToken.uid]) {
      throw new Error('Vous êtes déjà membre de ce projet')
    }

    await admin.firestore().collection('projects').doc(projectId).update({
      [`members.${decodedToken.uid}`]: invite.role,
    })

    await admin.firestore()
      .collection('projects')
      .doc(projectId)
      .collection('invites')
      .doc(token)
      .delete()

    return { success: true, project }
  })

export const checkEmailExists = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    email: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      const admin = getAdmin()
      await admin.auth().getUserByEmail(data.email)
      return { exists: true }
    } catch {
      return { exists: false }
    }
  })
