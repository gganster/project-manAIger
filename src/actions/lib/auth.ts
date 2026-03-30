import getAdmin from '@/firebase-admin';
import type { AppUser } from '@/lib/types';

export async function getUser(idToken: string, autoThrow = true) {
  try {
    const admin = getAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if (!decodedToken.uid) {
      throw new Error('Invalid token');
    }

    const user = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!user.exists) {
      throw new Error('AppUser not found');
    }

    return ({uid: decodedToken.uid, ...user.data()} as AppUser);
  } catch (error) {
    if (autoThrow) {
      throw error;
    } else {
      return null;
    }
  }
}
