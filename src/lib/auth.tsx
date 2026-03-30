import React, { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { setUser, getUser } from "@/features/project/firestore"
import type { AppUser } from "@/lib/types"

interface AuthContextValue {
  user: User | null
  loading: boolean
  appUser: AppUser | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
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
    await setUser(credential.user.uid, { email, displayName, createdAt: new Date() })
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, appUser, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
