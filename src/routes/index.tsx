import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { GitBranch, Kanban, Bot, Zap, Users, ArrowRight } from "lucide-react"

export const Route = createFileRoute("/")({ component: IndexPage })

function IndexPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/projects" })
    }
  }, [user, loading, navigate])

  if (loading) return null
  if (user) return null

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-md">
        <div className="page-wrap flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Kanban className="h-5 w-5 text-[var(--lagoon)]" />
            <span className="text-lg font-bold tracking-tight text-[var(--sea-ink)]">
              ProjectManAIger
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Se connecter</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Commencer gratuitement</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pb-20 pt-24 md:pt-32">
        <div className="page-wrap text-center">
          <div className="rise-in mx-auto max-w-3xl">
            <div className="island-kicker mb-4">Propulsé par l'IA</div>
            <h1 className="display-title mb-6 text-4xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] md:text-5xl lg:text-6xl">
              Votre board qui s'adapte à votre{" "}
              <span className="text-[var(--lagoon)]">code</span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[var(--sea-ink-soft)]">
              ProjectManAIger connecte votre kanban à Git. Les cartes bougent automatiquement
              quand vous pushez, mergez ou créez des branches. Moins de clics, plus de code.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="gap-2 px-8">
                  Créer un compte
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-8">
                  Se connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="page-wrap">
          <div className="mb-12 text-center">
            <h2 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)] md:text-3xl">
              Construit pour les devs
            </h2>
            <p className="text-[var(--sea-ink-soft)]">
              Tout ce dont une petite équipe a besoin, rien de superflu.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<GitBranch className="h-6 w-6" />}
              title="Sync Git automatique"
              description="Créez une branche, la carte passe en cours. Mergez une PR, elle passe en done. Zéro effort."
            />
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title="Serveur MCP intégré"
              description="Pilotez votre board depuis Claude Code. Créez des cartes, changez les statuts, le tout en langage naturel."
            />
            <FeatureCard
              icon={<Kanban className="h-6 w-6" />}
              title="Kanban drag & drop"
              description="Un board simple et rapide avec des colonnes personnalisables. Glissez, déposez, c'est fait."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Temps réel"
              description="Toutes les modifications sont instantanément visibles par toute l'équipe grâce à Firestore."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Multi-équipes"
              description="Invitez vos collègues par email, gérez les rôles admin et membre sur chaque projet."
            />
            <FeatureCard
              icon={<ArrowRight className="h-6 w-6" />}
              title="Refs & branches"
              description="Chaque carte a une référence unique (PM-42) liée à une branche Git pour un suivi précis."
            />
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="page-wrap">
          <div className="island-shell mx-auto max-w-2xl rounded-2xl p-10 text-center">
            <h2 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)] md:text-3xl">
              Prêt à coder sans friction ?
            </h2>
            <p className="mb-8 text-[var(--sea-ink-soft)]">
              Gratuit pour les équipes de 2 à 5 personnes. Aucune carte bancaire requise.
            </p>
            <Link to="/register">
              <Button size="lg" className="gap-2 px-8">
                Commencer maintenant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer py-8">
        <div className="page-wrap flex items-center justify-between text-sm text-[var(--sea-ink-soft)]">
          <div className="flex items-center gap-2">
            <Kanban className="h-4 w-4 text-[var(--lagoon)]" />
            <span>ProjectManAIger</span>
          </div>
          <p>&copy; {new Date().getFullYear()} ProjectManAIger</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="feature-card rounded-xl border border-[var(--line)] p-6 transition-all">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--lagoon)]/10 text-[var(--lagoon)]">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-[var(--sea-ink)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">{description}</p>
    </div>
  )
}
