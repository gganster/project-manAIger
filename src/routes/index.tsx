import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/')({ component: IndexPage })

function IndexPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (user) {
      navigate({ to: '/projects' })
    } else {
      navigate({ to: '/login' })
    }
  }, [user, loading, navigate])

  return null
}
