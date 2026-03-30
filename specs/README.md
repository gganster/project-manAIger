# Implementation Tasks Overview

## Project Summary
**From PRD**: ProjectFlow — kanban dev-native qui s'auto-actualise en fonction de l'état Git. Board multi-projet avec MCP server pour automatiser la gestion depuis Claude Code.
**Tech Stack**: TanStack Start (SPA) + Firebase (Auth + Firestore) + shadcn/ui + dnd-kit + MCP Server (Admin SDK)
**Current State**: Boilerplate TanStack Start avec router, Header/Footer/ThemeToggle. Tout est à construire.

## Task Execution Guidelines
- Read complete task before starting
- Check dependencies are met
- Follow ARCHI patterns (SPA, Firestore client direct, Admin SDK pour MCP)
- Validate against success criteria
- Types partagés dans `src/lib/types.ts` sont la source de vérité du data model

## MVP Tasks (specs/01-mvp/)

### Phase 1: Foundation (J1 matin)
- [ ] `01-foundation-firebase-shadcn.md` — Setup Firebase, shadcn/ui, dnd-kit, types et Firestore helpers (2h)
- [ ] `02-auth-flow.md` — Login, register, auth guard, user context (1.5h)

### Phase 2: Core Features (J1 après-midi → J2 matin)
- [ ] `03-projects-crud.md` — CRUD projets, invitation membres, settings, rôles (2.5h)
- [ ] `04-kanban-board.md` — Board 4 colonnes, drag & drop, CRUD cartes, real-time (3h)
- [ ] `05-layout-navigation.md` — Sidebar, header, navigation entre projets, responsive (1.5h)

### Phase 3: MCP Server (J2 après-midi)
- [ ] `06-mcp-server-tools.md` — MCP server setup, Firebase Admin SDK, 7 tools CRUD (2.5h)
- [ ] `07-mcp-prompts-git.md` — 4 prompts intelligents, matching git→carte, actions auto (2.5h)

## Dependency Map

```
01-Foundation
├── 02-Auth
│   └── 03-Projects
│       ├── 04-Kanban Board
│       │   └── 06-MCP Tools
│       │       └── 07-MCP Prompts
│       └── 05-Layout & Navigation
```

## PRD Coverage

- ✅ **Kanban Board Multi-Projet**: Tasks 03, 04, 05
- ✅ **Serveur MCP (Tools + Prompts)**: Tasks 06, 07
- ✅ **Détection Git → Carte**: Task 07
- ✅ **Auth & Multi-Tenant**: Tasks 01, 02, 03

## Total Estimated Time: ~16h (2 jours)
