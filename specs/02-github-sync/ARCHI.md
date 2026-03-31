# Technical Architecture: GitHub Sync

## Architecture Overview

**Philosophy**: Étendre l'architecture existante (TanStack Start SPA + Firebase) avec une GitHub App pour l'OAuth et les webhooks. Route Nitro brute pour recevoir les webhooks (vérification HMAC, pas de server function). Claude API pour le matching intelligent branche → tâche quand la ref PM-XX n'est pas dans le nom de branche.

**Nouveaux éléments dans le stack** :
- GitHub App : OAuth flow + webhook auto-configuré à l'installation
- Route Nitro : endpoint `/api/github/webhook` pour recevoir les événements GitHub
- Claude API (Anthropic SDK) : matching IA branche → tâche
- ngrok : tunnel local pour recevoir les webhooks en dev

## GitHub App vs OAuth App

**Décision : GitHub App**
- **Why** : Les GitHub Apps permettent de configurer les webhooks automatiquement à l'installation de l'app sur un repo. Pas besoin de créer le webhook via API séparément. Permissions granulaires (read-only sur les branches, write sur les webhooks).
- **Trade-off** : Setup initial plus complexe (créer l'app sur GitHub, configurer le manifest), mais le flow utilisateur est plus simple (un seul clic pour installer + autoriser).
- **Conséquence** : Le token d'installation (installation access token) est par repo, pas par user. Le user_token OAuth sert à lister les repos, l'installation_token sert à interagir avec le repo.

## Données ajoutées au modèle Firestore

### User — champs ajoutés
```
/users/{uid}
  + github?: {
      id: number              // GitHub user ID
      login: string           // GitHub username
      accessToken: string     // OAuth user token (chiffré)
      connectedAt: timestamp
    }
```

### Project — champs modifiés
```
/projects/{projectId}
  settings: {
    github?: {
      repo: string            // (existant) nom du repo
      owner: string           // (existant) propriétaire
    + installationId: number   // GitHub App installation ID
    + webhookActive: boolean   // statut du webhook
    + connectedBy: string     // uid du user qui a connecté
    + connectedAt: timestamp
    }
  }
```

### Cards — pas de changement
Le champ `gitBranch?: string` existant est utilisé pour lier une branche à une carte.

## Routes & Endpoints

### 1. OAuth Flow (Server Functions)

```
GET  /api/github/auth          → Redirect vers GitHub OAuth (state = projectId + uid)
GET  /api/github/callback      → Reçoit le code, échange token, stocke dans user, redirige
```

Ces deux routes sont des routes Nitro (pas des server functions) car elles font des redirects HTTP.

### 2. Webhook Endpoint (Route Nitro)

```
POST /api/github/webhook       → Reçoit les événements GitHub
```

- Vérifie la signature HMAC (`X-Hub-Signature-256`) avec le webhook secret
- Parse le payload selon `X-GitHub-Event` header
- Route vers le handler approprié (branch created, PR merged)

### 3. Server Functions (existantes, étendues)

```
POST serverLinkRepo            → Installe la GitHub App sur un repo, configure le webhook
POST serverUnlinkRepo          → Supprime l'installation et le webhook
POST serverListRepos           → Liste les repos accessibles par le user via son token GitHub
```

## Flow détaillé : OAuth + Installation

```
1. User clique "Connecter GitHub" dans les settings du projet
2. Redirect → GitHub OAuth authorize URL
   - scope: repo (pour lister les repos)
   - state: { projectId, uid } (encodé + signé)
3. User autorise → GitHub redirige vers /api/github/callback
4. Callback :
   a. Échange code → access_token
   b. Fetch GitHub user info (id, login)
   c. Stocke dans /users/{uid}.github
   d. Redirige vers /projects/{projectId}/settings?github=connected
5. User sélectionne un repo dans la liste
6. serverLinkRepo :
   a. Crée/vérifie l'installation de la GitHub App sur le repo
   b. Stocke installationId + repo info dans le projet
   c. Le webhook est auto-configuré par la GitHub App
```

## Flow détaillé : Webhook → Action

```
POST /api/github/webhook
  │
  ├─ Vérifie signature HMAC
  ├─ Parse X-GitHub-Event
  │
  ├─ "create" (ref_type === "branch")
  │   ├─ Extraire le nom de la branche
  │   ├─ Trouver le projectId via installationId
  │   ├─ Chercher une carte avec ref PM-XX dans le nom de branche (regex)
  │   │   ├─ Match exact → lier branche + status → in_progress
  │   │   └─ Pas de match → appel Claude API pour matching par titre
  │   │       ├─ Match IA → lier branche + status → in_progress
  │   │       └─ Pas de match → créer nouvelle carte + status in_progress
  │   └─ Done
  │
  ├─ "pull_request" (action === "closed" && merged === true)
  │   ├─ Extraire branche source (head.ref) et branche cible (base.ref)
  │   ├─ Trouver le projectId via installationId
  │   │
  │   ├─ base === "dev"
  │   │   └─ Chercher carte liée à head.ref → status → testing
  │   │
  │   ├─ base === "main" && head !== "dev"
  │   │   └─ Chercher carte liée à head.ref → status → done
  │   │
  │   ├─ base === "main" && head === "dev"
  │   │   └─ Toutes les cartes en testing → status → done
  │   │
  │   └─ Done
  │
  └─ Autre événement → ignorer (200 OK)
```

## Matching IA (Claude API)

### Stratégie à deux niveaux

**Niveau 1 : Regex (gratuit, instantané)**
- Pattern : `/PM-(\d+)/i` dans le nom de branche
- Ex: `feature/PM-12-user-profile` → match PM-12
- Si match → pas d'appel IA

**Niveau 2 : Claude API (fallback)**
- Quand la branche n'a pas de ref PM-XX (ex: `fix/login-bug`, `feature/user-settings`)
- Prompt : envoie le nom de la branche + la liste des titres+refs des cartes du projet
- Claude retourne la ref de la carte la plus probable ou `null`
- Modèle : `claude-haiku-4-5-20251001` (rapide, pas cher)

```typescript
// Pseudo-code du prompt
const prompt = `Tu reçois un nom de branche Git et une liste de tâches.
Trouve la tâche qui correspond le mieux à cette branche.
Réponds UNIQUEMENT avec la ref de la tâche (ex: "PM-12") ou "null" si aucune ne correspond.

Branche: ${branchName}

Tâches:
${cards.map(c => `- ${c.ref}: ${c.title}`).join('\n')}`;
```

### SDK
- `@anthropic-ai/sdk` côté serveur
- Env : `CLAUDE_API_KEY`

## Fichiers à créer / modifier

### Nouveaux fichiers

```
src/
├── api/                              # Routes Nitro
│   └── github/
│       ├── auth.ts                   # GET → redirect OAuth
│       ├── callback.ts               # GET → échange token, stocke, redirige
│       └── webhook.ts                # POST → réception événements
├── actions/github/
│   ├── serverLinkRepo.ts             # Installe app sur repo
│   ├── serverUnlinkRepo.ts           # Supprime le lien
│   └── serverListRepos.ts            # Liste les repos du user
└── lib/
    ├── github.ts                     # Helpers GitHub API (fetch repos, create installation token)
    └── claude.ts                     # Helper Claude API (matching branche → tâche)
```

### Fichiers modifiés

```
src/
├── lib/types.ts                      # Ajouter GitHubConnection sur AppUser, étendre Project.settings
├── routes/profile.tsx                # Ajouter section état connexion GitHub
├── routes/projects/$projectId/
│   └── settings.tsx                  # Remplacer inputs GitHub par OAuth flow + sélection repo
├── features/board/
│   ├── edit-card-dialog.tsx          # Ajouter champ gitBranch (lier/délier manuellement)
│   └── kanban-card.tsx               # Afficher badge branche si liée
└── features/project/firestore.ts     # Helpers pour lire/écrire les champs GitHub
```

## Configuration GitHub App

### Manifest (à créer sur github.com/settings/apps)

```
Name: ProjectManAIger
Homepage URL: https://<domain>
Callback URL: https://<domain>/api/github/callback
Webhook URL: https://<domain>/api/github/webhook
Webhook secret: <GITHUB_WEBHOOK_SECRET>

Permissions:
  - Contents: Read-only (pour lister les branches)
  - Pull requests: Read-only (pour détecter les merges)
  - Metadata: Read-only (obligatoire)

Events:
  - Create (branches)
  - Pull request

Setup URL: https://<domain>/api/github/auth (pour le flow d'installation)
```

### Variables d'environnement ajoutées

```
GITHUB_APP_ID=<app_id>
GITHUB_APP_PRIVATE_KEY=<private_key_pem>
GITHUB_CLIENT_ID=<oauth_client_id>
GITHUB_CLIENT_SECRET=<oauth_client_secret>
GITHUB_WEBHOOK_SECRET=<webhook_secret>
CLAUDE_API_KEY=<anthropic_api_key>
```

## Dev local : ngrok

### Package.json — scripts ajoutés

```json
{
  "scripts": {
    "dev": "vinxi dev",
    "dev:tunnel": "concurrently \"vinxi dev\" \"ngrok http 3000 --log stdout\"",
  }
}
```

### Dépendances ajoutées

```json
{
  "devDependencies": {
    "ngrok": "^5.0.0-beta.2",
    "concurrently": "^9.0.0"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0"
  }
}
```

## Sécurité

- **Webhook HMAC** : chaque requête webhook est vérifiée avec `GITHUB_WEBHOOK_SECRET` via `crypto.timingSafeEqual`
- **OAuth state** : le paramètre `state` est signé (HMAC) pour éviter les attaques CSRF
- **Token stockage** : le `accessToken` GitHub est stocké dans Firestore, accessible uniquement par le user lui-même (security rules)
- **Installation tokens** : éphémères (1h), générés à la demande via la clé privée de la GitHub App
- **Firestore rules** : le champ `github` du user est read/write par le user lui-même uniquement

## Firestore Rules — ajouts

```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  // Le champ github.accessToken est protégé par cette règle
}
```

Pas de changement sur les règles des projets/cartes — les modifications de cartes via webhook passent par le Firebase Admin SDK (bypass des rules).

## Implementation Priority

### Phase 1 : OAuth + Config (20 min)
1. Créer la GitHub App sur github.com
2. Routes Nitro : `/api/github/auth` et `/api/github/callback`
3. Stocker token GitHub sur le user dans Firestore
4. Afficher état connexion GitHub dans le profil

### Phase 2 : Repo linking + Webhook (15 min)
1. `serverListRepos` — lister les repos via token GitHub
2. UI settings : sélection de repo (remplacer les inputs manuels)
3. `serverLinkRepo` — stocker installationId + repo dans le projet
4. Route Nitro : `/api/github/webhook` avec vérification HMAC

### Phase 3 : Matching + Actions (20 min)
1. Helper `claude.ts` — matching IA branche → tâche
2. Handler webhook `create` → match branche, lier carte, status in_progress
3. Handler webhook `pull_request` → merge dev/main, update statuts
4. Tester avec ngrok

### Phase 4 : UI (5 min)
1. Badge branche sur les cartes du kanban
2. Champ gitBranch dans edit-card-dialog (override manuel)
