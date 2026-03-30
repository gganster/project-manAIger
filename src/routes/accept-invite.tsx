import { auth } from '@/firebase'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Mail, Shield, FolderKanban, LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { Invite, Project } from '@/lib/types'
import { validateInvite, acceptInvite, checkEmailExists } from '@/actions/invite/serverInvitation'

type SearchParams = {
  token: string
  projectId: string
}

export const Route = createFileRoute('/accept-invite')({
  validateSearch: (search): SearchParams => ({
    token: search.token as string,
    projectId: search.projectId as string,
  }),
  component: AcceptInviteComponent,
})

function AcceptInviteComponent() {
  const navigate = useNavigate()
  const { token, projectId } = useSearch({ from: '/accept-invite' })
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [emailExists, setEmailExists] = useState<boolean | null>(null)

  const _validateInvite = useServerFn(validateInvite)
  const _acceptInvite = useServerFn(acceptInvite)
  const _checkEmailExists = useServerFn(checkEmailExists)

  useEffect(() => {
    const validate = async () => {
      if (!token || !projectId) {
        setError('Paramètres d\'invitation manquants')
        setLoading(false)
        return
      }

      try {
        const result = await _validateInvite({ data: { token, projectId } })

        if (!result.valid) {
          setError(result.error || 'Invitation invalide')
          setLoading(false)
          return
        }

        setInvite(result.invite!)
        setProject(result.project!)

        if (!user) {
          const emailCheck = await _checkEmailExists({ data: { email: result.invite!.email } })
          setEmailExists(emailCheck.exists)
        }

        setLoading(false)
      } catch {
        setError('Erreur lors de la validation de l\'invitation')
        setLoading(false)
      }
    }

    validate()
  }, [token, projectId, user])

  const handleAcceptInvite = async () => {
    if (!user || !invite || !project) return

    setProcessing(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) throw new Error('Token d\'authentification manquant')

      await _acceptInvite({ data: { idToken, token, projectId } })

      setSuccess(true)
      setTimeout(() => {
        navigate({ to: '/projects/$projectId', params: { projectId } })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation')
    } finally {
      setProcessing(false)
    }
  }

  const handleRedirectToAuth = (type: 'login' | 'register') => {
    navigate({
      to: type === 'login' ? '/login' : '/register',
      search: {
        redirect: `/accept-invite?token=${token}&projectId=${projectId}`,
      },
    })
  }

  function InviteDetails({ invite, project }: { invite: Invite; project: Project }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Email</span>
          <span className="ml-auto font-medium">{invite.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Rôle</span>
          <span className="ml-auto font-medium">{invite.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Projet</span>
          <span className="ml-auto font-medium">{project.name}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Validation de l'invitation...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-center">Invitation invalide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-destructive">{error}</p>
            <Button
              className="w-full"
              onClick={() => navigate({ to: '/' })}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-center">Invitation acceptée !</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">
              Vous avez rejoint le projet &laquo; {project?.name} &raquo;. Redirection...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user && invite && project) {
    if (user.email !== invite.email) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Email incorrect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cette invitation est destinée à <span className="font-medium text-foreground">{invite.email}</span>, mais vous êtes connecté en tant que <span className="font-medium text-foreground">{user.email}</span>.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  auth.signOut()
                  window.location.reload()
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter et réessayer
              </Button>
              <Button
                className="w-full"
                onClick={() => navigate({ to: '/projects' })}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux projets
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Invitation au projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InviteDetails invite={invite} project={project} />

            <Button
              className="w-full"
              onClick={handleAcceptInvite}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Acceptation...
                </>
              ) : (
                'Accepter l\'invitation'
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate({ to: '/projects' })}
            >
              Annuler
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user && invite && project) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Invitation au projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InviteDetails invite={invite} project={project} />

            {emailExists === true && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Un compte existe déjà avec cette adresse email.
                </p>
                <Button
                  className="w-full"
                  onClick={() => handleRedirectToAuth('login')}
                >
                  Se connecter pour accepter
                </Button>
              </div>
            )}

            {emailExists === false && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Vous devez créer un compte pour accepter cette invitation.
                </p>
                <Button
                  className="w-full"
                  onClick={() => handleRedirectToAuth('register')}
                >
                  Créer un compte
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleRedirectToAuth('login')}
                >
                  J'ai déjà un compte
                </Button>
              </div>
            )}

            {emailExists === null && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Vérification...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
