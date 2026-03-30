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

**SPA mode** — TanStack Start with no SSR. Firebase Hosting serves static files. No server-side rendering needed (private dashboard behind auth).

### Stack
- **Framework**: TanStack Start (React 19, file-based routing, server functions)
- **Database**: Firestore (real-time via onSnapshot)
- **Auth**: Firebase Auth (email/password)
- **UI**: shadcn/ui + Tailwind CSS v4 + dnd-kit (kanban drag & drop)
- **MCP Server**: Separate TypeScript package in `mcp-server/` using Firebase Admin SDK

### Firebase — Two SDK Patterns

**Client-side (frontend)**: Always use the helpers from `src/firebase.ts`. Never import `firebase/firestore` directly in components — use the re-exported wrappers:
```typescript
import { getDoc, onCollection, collection, query, where, doc, setDoc, updateDoc, deleteDoc } from '#/firebase'
```
These helpers auto-convert Firestore Timestamps to JS Dates and inject `{id}` into documents.

**Server-side (server functions)**: Use Firebase Admin SDK via `src/firebase-admin.ts` (modular):
```typescript
import getAdmin from '#/firebase-admin'
const app = getAdmin()
const db = app.firestore()
```
Admin SDK env vars: `FIREB_PROJECT_ID`, `FIREB_PRIVATE_KEY`, `FIREB_CLIENT_EMAIL`.

### Firebase Config

Client config is in `config.ts` (root). Not in `.env` — it's public Firebase web config.

### Routing

File-based routing via TanStack Router. Route tree is auto-generated in `src/routeTree.gen.ts` — never edit manually. Path alias: `#/*` maps to `./src/*`.

### Data Model (Firestore)

```
/users/{uid} — email, displayName, createdAt
/projects/{projectId} — name, slug, ownerId, members{uid: role}, cardCounter, settings
/projects/{projectId}/cards/{cardId} — title, description, status, priority, ref (PM-1), order
```

Card statuses: `backlog | in_progress | testing | done`
Card priorities: `low | medium | high | urgent`
Project roles: `admin | user`
Card refs: auto-incremented per project (PM-1, PM-2...) for Git branch detection.

### MCP Server (`mcp-server/`)

Separate TypeScript package. Communicates directly with Firestore via Admin SDK (no HTTP layer). Exposes tools (CRUD cards/projects) and prompts (Git→board automation). Runs as stdio process for Claude Code.

## Specs & Planning

- `PRD.md` — Product requirements, user flows, success metrics
- `ARCHI.md` — Technical architecture, ADRs, folder structure, data model
- `specs/01-mvp/` — Implementation task files (01 through 07), ordered by dependency
- `specs/README.md` — Task overview with dependency map
