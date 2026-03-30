# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProjectFlow — a dev-native kanban board that auto-updates based on Git state. Multi-tenant project management with an MCP server for automation from Claude Code. Built for small dev teams (2-5 people).

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run test     # Run tests (vitest)
```

## Architecture

**SPA mode** — TanStack Start with Vite, no SSR. Firebase Hosting serves static files. Server functions (`createServerFn`) used for backend logic (auth verification, emails).

### Stack
- **Framework**: Vite + TanStack Start (React 19, file-based routing, server functions)
- **Database**: Firestore (real-time via onSnapshot)
- **Auth**: Firebase Auth (email/password) with `AuthProvider` context (`src/lib/auth.tsx`)
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS v4 + dnd-kit (kanban drag & drop)
- **Icons**: lucide-react
- **MCP Server**: Separate TypeScript package in `mcp-server/` using Firebase Admin SDK

### Project Structure

```
src/
├── features/                # Feature-based modules (domain logic + UI + data)
│   ├── board/               # Kanban board feature
│   │   ├── firestore.ts     # Card CRUD (createCard, updateCard, moveCard, deleteCard, onProjectCards)
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   ├── kanban-card.tsx
│   │   ├── create-card-dialog.tsx
│   │   └── edit-card-dialog.tsx
│   └── project/             # Project management feature
│       ├── firestore.ts     # Project + User CRUD (getProject, createProject, inviteMember, getUser, etc.)
│       ├── create-project-dialog.tsx
│       └── invite-member-dialog.tsx
├── components/
│   ├── layout/              # App shell: app-layout, header, sidebar
│   └── ui/                  # shadcn/ui primitives (button, card, dialog, input, select, badge, avatar, etc.)
├── lib/
│   ├── auth.tsx             # AuthProvider context, signIn/signUp/signOut
│   ├── types.ts             # TypeScript types: Card, Project, AppUser, CardStatus, CardPriority
│   └── utils.ts             # cn() utility
├── routes/
│   ├── __root.tsx           # Root layout with AuthProvider
│   ├── index.tsx            # Home / redirect
│   ├── login.tsx            # Login page
│   ├── register.tsx         # Registration page
│   └── projects/
│       ├── index.tsx        # Projects list
│       └── $projectId/
│           ├── index.tsx    # Kanban board view
│           └── settings.tsx # Project settings
├── actions/                 # TanStack Start server functions (createServerFn)
│   ├── lib/                 # Shared server-side helpers
│   │   ├── auth.ts          # getUser(idToken) — verifies Firebase idToken via Admin SDK
│   │   └── sendEmail.ts     # Brevo SMTP email sender
│   └── [action].ts          # One file per server action (Zod-validated, POST)
├── firebase.ts              # Client Firebase SDK helpers (re-exported wrappers)
├── firebase-admin.ts        # Admin SDK for server functions
├── firebase-storage.ts
├── router.tsx               # TanStack Router config
└── routeTree.gen.ts         # Auto-generated — never edit
```

### Firebase — Two SDK Patterns

**Client-side (frontend)**: Always use the helpers from `src/firebase.ts`. Never import `firebase/firestore` directly in components — use the re-exported wrappers:
```typescript
import { getDoc, onCollection, collection, query, where, doc, setDoc, updateDoc, deleteDoc } from '@/firebase'
```
These helpers auto-convert Firestore Timestamps to JS Dates and inject `{id}` into documents.

**Firestore helpers**: Each feature has its own `firestore.ts` with domain-specific CRUD functions. Board cards → `features/board/firestore.ts`, Projects/Users → `features/project/firestore.ts`. New features should follow the same pattern.

**Server-side (server functions)**: `src/actions/` uses `createServerFn` from TanStack Start with Firebase Admin SDK. Pattern:
```typescript
import { createServerFn } from '@tanstack/react-start'
import getAdmin from '@/firebase-admin'

export const myAction = createServerFn({ method: "POST" })
  .inputValidator(zodSchema)          // Zod validation on input
  .handler(async ({ data }) => {
    const admin = getAdmin()
    const decoded = await admin.auth().verifyIdToken(data.idToken) // Auth via idToken
    // ... Admin SDK logic
  })
```
- **ALWAYS** validate idToken server-side via `admin.auth().verifyIdToken()` — use `actions/lib/auth.ts` helper
- Shared server helpers in `actions/lib/` (auth, email)
- Admin SDK env vars: `FIREB_PROJECT_ID`, `FIREB_PRIVATE_KEY`, `FIREB_CLIENT_EMAIL`
- Email via Brevo API: env vars `BREVO_API_KEY`, `BREVO_SENDER_NAME`, `BREVO_SENDER_EMAIL`

### Firebase Config

Client config is in `config.ts` (root). Not in `.env` — it's public Firebase web config.

### Routing

File-based routing via TanStack Router. Route tree is auto-generated in `src/routeTree.gen.ts` — never edit manually. Path alias: `@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Data Model (Firestore)

```
/users/{uid} — email, displayName, createdAt
/projects/{projectId} — name, slug, ownerId, members{uid: role}, cardCounter, settings{github?}
/projects/{projectId}/cards/{cardId} — title, description, status, priority, ref, order, assigneeId?, deadline?, gitBranch?
```

Card statuses: `backlog | in_progress | testing | done`
Card priorities: `low | medium | high | urgent`
Project roles: `admin | user`
Card refs: auto-incremented per project (PM-1, PM-2...) for Git branch detection.

### Firestore Rules

Security rules in `firestore.rules`:
- Users can only read/write their own `/users/{uid}` doc
- Projects readable by members, writable (update/delete) by admins only, anyone authed can create
- Cards readable/writable by project members

Always check and modify rules when changing data model or access patterns.

### MCP Server (`mcp-server/`)

Separate TypeScript package with its own `package.json` and `tsconfig.json`. Structure: `src/index.ts`, `src/lib/`, `src/tools/`, `src/prompts/`. Communicates directly with Firestore via Admin SDK (no HTTP layer). Exposes tools (CRUD cards/projects) and prompts (Git→board automation). Runs as stdio process for Claude Code.

## Specs & Planning

- `PRD.md` — Product requirements, user flows, success metrics
- `ARCHI.md` — Technical architecture, ADRs, folder structure, data model
- `specs/01-mvp/` — Implementation task files (01 through 07), ordered by dependency
- `specs/README.md` — Task overview with dependency map
