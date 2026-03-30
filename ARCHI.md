# Technical Architecture: ProjectFlow

## Architecture Overview

**Philosophy**: Client-first SPA avec Firebase comme backend. Pas de SSR — TanStack Start sert de framework SPA avec routing typé et server functions quand nécessaire. Le MCP server est un process local séparé qui communique directement avec Firestore via Admin SDK. Simplicité maximale, zero infrastructure custom.

**Tech Stack Summary**:
- Framework: TanStack Start (SPA mode, no SSR)
- Deployment: Firebase Hosting
- Database: Firestore
- Authentication: Firebase Auth
- MCP Server: TypeScript, Firebase Admin SDK
- UI: shadcn/ui + Tailwind CSS + dnd-kit

## Frontend Architecture

### Core Stack

- **Framework**: TanStack Start (React)
  - **Why**: Déjà initialisé, routing typé file-based, server functions intégrées
  - **Trade-off**: Pas de SSR utilisé → on perd le SEO, mais c'est un dashboard privé donc pas besoin

- **UI Components**: shadcn/ui + Tailwind CSS v4
  - **Why**: Composants accessibles, customisables, pas de vendor lock-in
  - **Trade-off**: Setup initial mais copié dans le projet = contrôle total

- **Drag & Drop**: dnd-kit
  - **Why**: Performant, accessible, bien maintenu, supporte les listes sortables (colonnes kanban)
  - **Trade-off**: Plus de setup que @hello-pangea/dnd mais plus flexible

### State Management

- **Global State**: React hooks only (useState, useContext)
- **Server State**: Lib custom fournie par l'utilisateur + Firestore onSnapshot pour le real-time
- **URL State**: TanStack Router search params (projet actif, filtres éventuels)

### Data Fetching Strategy

1. **Priorité : Firestore client SDK** — lectures/écritures directes depuis le client via onSnapshot (real-time) et CRUD operations
2. **Fallback : Server Functions (Firebase Admin SDK)** — pour les opérations nécessitant des permissions élevées (invitations, suppression de projet, opérations admin)
3. **Lib custom** fournie par l'utilisateur pour le data fetching/cache

## Backend Architecture

### API Layer

- **Pattern**: Firestore client SDK direct + TanStack Start Server Functions pour les opérations admin
- **Validation**: Zod pour la validation des inputs côté server functions
- **Security**: Firestore Security Rules comme couche de sécurité principale côté client. Server functions protégées par vérification du token Firebase Auth.

### Authentication & Authorization

- **Provider**: Firebase Auth
  - **Why**: Déjà choisi, intégré nativement avec Firestore, gratuit pour le volume MVP
- **Method**: Email/password (MVP). OAuth (Google) en post-MVP.
- **Authorization**:
  - Firestore Security Rules pour le contrôle d'accès côté client
  - Rôles par projet : `admin` (CRUD projet + membres) / `user` (CRUD cartes)
  - Stocké dans le document projet : `members: { [uid]: "admin" | "user" }`

### Database — Firestore

**Why Firestore**:
- Real-time natif (onSnapshot) → le board se met à jour en live pour tous les membres
- Pas de serveur à gérer
- Modèle document = naturel pour des cartes kanban
- Intégré avec Firebase Auth (security rules)

**Trade-off**: Pas de requêtes relationnelles complexes, queries limitées vs SQL. Mais pour un kanban c'est largement suffisant.

#### Data Model

```
/users/{uid}
  - email: string
  - displayName: string
  - createdAt: timestamp

/projects/{projectId}
  - name: string
  - slug: string
  - ownerId: string (uid)
  - members: { [uid]: "admin" | "user" }
  - createdAt: timestamp
  - updatedAt: timestamp
  - settings: {
      github?: { repo: string, owner: string }
    }
  - cardCounter: number  // auto-increment pour PM-1, PM-2...

/projects/{projectId}/cards/{cardId}
  - title: string
  - description: string
  - status: "backlog" | "in_progress" | "testing" | "done"
  - priority: "low" | "medium" | "high" | "urgent"
  - assigneeId?: string (uid)
  - deadline?: timestamp
  - order: number  // pour le tri dans une colonne
  - ref: string  // "PM-1", "PM-2" — identifiant lisible
  - gitBranch?: string  // branche associée détectée
  - createdAt: timestamp
  - updatedAt: timestamp
  - createdBy: string (uid)
```

#### Firestore Security Rules (simplifié)

```
- /users/{uid}: lecture/écriture par le user lui-même
- /projects/{projectId}: lecture si membre, écriture si admin
- /projects/{projectId}/cards/*: lecture/écriture si membre du projet
```

### MCP Server

- **Runtime**: Process local TypeScript (stdio), lancé par Claude Code
- **SDK**: Firebase Admin SDK (accès direct Firestore, pas de security rules)
- **Auth**: Service account Firebase (fichier JSON local)

#### Tools exposés

| Tool | Description |
|------|-------------|
| `list_projects` | Liste les projets de l'utilisateur |
| `list_cards` | Liste les cartes d'un projet (filtrable par status) |
| `create_card` | Crée une carte dans un projet |
| `update_card` | Met à jour une carte (titre, description, status, etc.) |
| `move_card` | Déplace une carte vers un status donné |
| `delete_card` | Supprime une carte |
| `get_project_summary` | Résumé de l'état du projet (nb cartes par colonne) |

#### Prompts exposés

| Prompt | Description |
|--------|-------------|
| `commit_and_push` | Détecte la tâche liée au commit, met à jour le status. Si merge main → "done" |
| `start_task` | Identifie la carte par nom/ref, la passe en "in_progress" |
| `create_branch` | Crée/détecte une branche, associe à une carte ou en crée une |
| `project_status` | Résume l'état du projet pour le dev |

## Infrastructure & Deployment

- **Platform**: Firebase Hosting
  - **Why**: Gratuit pour le volume MVP, intégré avec le reste de Firebase, CDN global
  - **Trade-off**: Pas de SSR edge, mais on n'en a pas besoin (SPA)
- **Region**: `europe-west1` (ou la plus proche)
- **Background Jobs**: Pas nécessaire en MVP V1. MVP V2 → n8n self-hosted pour les webhooks GitHub
- **Monitoring**: Firebase Analytics (gratuit) + Crashlytics pour les erreurs

## Architecture Decision Records

### ADR-001: SPA sans SSR
- **Context**: TanStack Start supporte le SSR mais l'app est un dashboard privé derrière auth
- **Decision**: Mode SPA only, pas de SSR
- **Alternatives**: SSR pour le temps de chargement initial
- **Rationale**: Dashboard privé = pas de SEO, pas de besoin de SSR. Simplifie le déploiement sur Firebase Hosting (fichiers statiques)
- **Consequences**: First load légèrement plus lent, mais acceptable pour un dashboard

### ADR-002: Firestore client direct plutôt que API custom
- **Context**: On pourrait faire un backend API qui wrappe Firestore
- **Decision**: Client Firestore SDK direct avec security rules
- **Alternatives**: Server functions pour tout, API REST custom
- **Rationale**: Real-time gratuit via onSnapshot, moins de code, security rules = auth au niveau DB
- **Consequences**: Logique de validation partagée entre security rules et client. Les opérations admin passent par server functions.

### ADR-003: MCP via Admin SDK plutôt que via API web
- **Context**: Le MCP server pourrait appeler l'app web ou Firestore directement
- **Decision**: Admin SDK direct → Firestore
- **Alternatives**: Le MCP appelle des API routes de l'app TanStack Start
- **Rationale**: Pas de serveur web nécessaire, plus rapide, pas de CORS/auth HTTP à gérer. Le MCP est un outil local de confiance.
- **Consequences**: Deux "clients" Firestore (web app + MCP) avec des niveaux de permission différents. Le MCP bypass les security rules.

### ADR-004: Card refs (PM-1, PM-2) pour la détection Git
- **Context**: Il faut pouvoir lier un commit/branche à une carte
- **Decision**: Chaque carte a un `ref` auto-incrémenté par projet (PM-1, PM-2...)
- **Alternatives**: Détection par titre uniquement (fuzzy matching)
- **Rationale**: Fiable et déterministe. Convention de branche `feat/PM-12-slug` → match exact
- **Consequences**: Nécessite un counter atomique par projet (Firestore increment)

## Folder Structure

```
project-manager/
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # Layout racine (auth guard, sidebar)
│   │   ├── index.tsx               # Redirect vers /projects
│   │   ├── login.tsx               # Page de login
│   │   ├── register.tsx            # Page d'inscription
│   │   └── projects/
│   │       ├── index.tsx           # Liste des projets
│   │       └── $projectId/
│   │           ├── index.tsx       # Board kanban
│   │           └── settings.tsx    # Settings projet (membres, GitHub)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── board/
│   │   │   ├── kanban-board.tsx    # Board principal avec dnd-kit
│   │   │   ├── kanban-column.tsx   # Colonne (backlog, en cours, etc.)
│   │   │   └── kanban-card.tsx     # Carte individuelle
│   │   ├── project/
│   │   │   ├── project-list.tsx
│   │   │   └── project-settings.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── lib/
│   │   ├── firebase.ts             # Firebase client init
│   │   ├── auth.ts                 # Auth helpers (login, register, guard)
│   │   ├── firestore.ts            # Firestore helpers (CRUD, onSnapshot hooks)
│   │   └── types.ts                # Types partagés (Card, Project, User)
│   ├── styles/
│   │   └── globals.css             # Tailwind + custom styles
│   ├── router.tsx
│   └── routeTree.gen.ts
├── mcp-server/
│   ├── src/
│   │   ├── index.ts                # Entry point MCP server (stdio)
│   │   ├── tools/                  # Tools CRUD
│   │   │   ├── cards.ts
│   │   │   └── projects.ts
│   │   ├── prompts/                # Prompts intelligents
│   │   │   ├── commit-and-push.ts
│   │   │   ├── start-task.ts
│   │   │   └── project-status.ts
│   │   └── lib/
│   │       ├── firebase-admin.ts   # Admin SDK init
│   │       └── types.ts
│   ├── package.json
│   └── tsconfig.json
├── firebase.json                   # Firebase Hosting config
├── firestore.rules                 # Security rules
├── .firebaserc
├── PRD.md
├── ARCHI.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Cost Estimation

### Monthly at MVP Scale (équipe de 5)

| Service | Coût |
|---------|------|
| Firestore | $0 (free tier: 50K reads/day, 20K writes/day) |
| Firebase Auth | $0 (free tier: 50K MAU) |
| Firebase Hosting | $0 (free tier: 10 GB/month) |
| **Total** | **$0/mois** |

### Free Tier Limits

- Firestore: 50K lectures/jour, 20K écritures/jour, 1 GiB stockage
- Firebase Auth: 50K MAU
- Firebase Hosting: 10 GB transfert/mois, 1 GB stockage

Pour une équipe de 5 devs avec un board actif, on reste très largement dans le free tier.

## Implementation Priority

### Phase 1: Foundation (J1 matin)
1. Setup Firebase (projet, auth, Firestore)
2. Setup Tailwind + shadcn/ui dans TanStack Start
3. Pages auth (login/register) + auth guard
4. Types partagés + helpers Firestore

### Phase 2: Core Features (J1 après-midi → J2 matin)
1. CRUD projets (créer, lister, inviter)
2. Board kanban avec dnd-kit (4 colonnes fixes)
3. CRUD cartes (créer, éditer, déplacer, supprimer)
4. Real-time via onSnapshot (board live)
5. Système de refs (PM-1, PM-2...)

### Phase 3: MCP Server (J2 après-midi)
1. Setup MCP server avec Admin SDK
2. Tools CRUD (list/create/update/move/delete cards)
3. Prompts (commit_and_push, start_task, project_status)
4. Test end-to-end : commit → carte déplacée
