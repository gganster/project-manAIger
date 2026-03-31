import React, { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from "firebase/auth"
import { getUser } from "@/features/project/firestore"
import { signUpUser } from "@/actions/user/serverSignUp"
import type { AppUser } from "@/lib/types"

interface AuthContextValue {
  user: User | null
  loading: boolean
  appUser: AppUser | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [appUser, setAppUserState] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUserState(firebaseUser)
      if (firebaseUser) {
        const profile = await getUser(firebaseUser.uid)
        setAppUserState(profile)
      } else {
        setAppUserState(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUp(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const idToken = await credential.user.getIdToken()
    await signUpUser({ data: { idToken, displayName } })
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user || !user.email) throw new Error("No authenticated user")
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await firebaseUpdatePassword(user, newPassword)
  }

  return (
    <AuthContext.Provider value={{ user, loading, appUser, signIn, signUp, signOut, resetPassword, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
