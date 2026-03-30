# Task 01: Setup Firebase, shadcn/ui et types partagés

## Context
Fondation technique du projet. Tout le reste en dépend : Firebase (Auth + Firestore) est le backend, shadcn/ui + Tailwind sont le design system, et les types TypeScript définissent le data model partagé entre le frontend et le MCP server.

## Scope
- Installer et configurer Firebase client SDK (Auth + Firestore)
- Initialiser shadcn/ui avec les composants de base
- Installer dnd-kit
- Créer les types TypeScript du data model (User, Project, Card)
- Créer les helpers Firestore (init, CRUD générique, onSnapshot hooks)
- Configurer les Firestore Security Rules de base
- Créer les fichiers Firebase config (firebase.json, .firebaserc, firestore.rules)

## Implementation Details

### Files to Create/Modify

- `src/lib/firebase.ts` — Init Firebase client (app, auth, db exports)
- `src/lib/types.ts` — Types partagés : User, Project, Card, CardStatus, CardPriority, ProjectRole
- `src/lib/firestore.ts` — Helpers CRUD Firestore + hooks onSnapshot React
- `src/lib/auth.ts` — Firebase Auth helpers (placeholder, implémenté en task 02)
- `src/styles.css` — Reset + import Tailwind + variables shadcn
- `firestore.rules` — Security rules Firestore
- `firebase.json` — Config Firebase Hosting + Firestore
- `.firebaserc` — Projet Firebase associé
- `src/components/ui/` — Composants shadcn de base (button, card, input, dialog, dropdown-menu, badge, avatar)

### Key Functionality

**Types (src/lib/types.ts)**:
```typescript
type CardStatus = "backlog" | "in_progress" | "testing" | "done"
type CardPriority = "low" | "medium" | "high" | "urgent"
type ProjectRole = "admin" | "user"

interface Card {
  id: string
  title: string
  description: string
  status: CardStatus
  priority: CardPriority
  assigneeId?: string
  deadline?: Date
  order: number
  ref: string // "PM-1", "PM-2"
  gitBranch?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

interface Project {
  id: string
  name: string
  slug: string
  ownerId: string
  members: Record<string, ProjectRole>
  cardCounter: number
  settings: { github?: { repo: string; owner: string } }
  createdAt: Date
  updatedAt: Date
}

interface AppUser {
  uid: string
  email: string
  displayName: string
  createdAt: Date
}
```

**Firestore helpers** : fonctions pour add/update/delete documents, et un hook React `useCollection` / `useDocument` basé sur onSnapshot pour le real-time.

**Security Rules** : users read/write own doc, projects read if member, write if admin, cards read/write if project member.

### Technologies Used
- Firebase JS SDK v10+ (firebase/app, firebase/auth, firebase/firestore)
- shadcn/ui (via npx shadcn@latest init + add)
- dnd-kit (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities)
- Tailwind CSS v4 (déjà installé)
- Zod (validation schemas)

### Architectural Patterns
- Firebase client SDK direct depuis le browser (ARCHI ADR-002)
- Types partagés importés via `#/lib/types` (path alias déjà configuré)
- Pas de SSR (ARCHI ADR-001)

## Success Criteria
- [ ] `npm run dev` démarre sans erreur
- [ ] Firebase est initialisé (import firebase.ts ne crash pas)
- [ ] Les types Card, Project, AppUser sont exportés et utilisables
- [ ] Au moins 5 composants shadcn/ui installés (button, card, input, dialog, badge)
- [ ] dnd-kit est installé
- [ ] firestore.rules existe avec les règles de base
- [ ] Zod est installé

## Testing & Validation

### Manual Testing Steps
1. `npm run dev` → l'app démarre sur localhost:3000
2. Vérifier que les imports `#/lib/types`, `#/lib/firebase` fonctionnent
3. Vérifier qu'un composant shadcn (Button) se rend correctement

### Edge Cases
- Firebase config manquante → erreur claire au démarrage
- Tailwind v4 + shadcn compatibilité

## Dependencies

**Must complete first**: Aucune (première tâche)

**Blocks**:
- Task 02: Auth flow
- Task 03: Projects CRUD
- Task 04: Kanban Board
- Task 06: MCP Server (types partagés)

## Related Documentation
- **PRD**: Stack Technique, Core Feature #4 (Auth & Multi-Tenant)
- **ARCHI**: Frontend Architecture, Database — Firestore, Data Model

---
**Estimated Time**: 2h
**Phase**: Foundation
