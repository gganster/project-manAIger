# Task 04: Board Kanban avec dnd-kit et CRUD cartes

## Context
PRD Feature #1 : Kanban Board. C'est le coeur de l'app — un board avec 4 colonnes fixes (Backlog, En cours, À tester, Fini) affichant les cartes du projet en real-time. Les cartes peuvent être créées, éditées, supprimées, et déplacées par drag & drop entre colonnes.

## Scope
- Page board kanban (/projects/$projectId)
- 4 colonnes fixes avec cartes triées par order
- Drag & drop de cartes entre colonnes et au sein d'une colonne (dnd-kit)
- Dialog création de carte (titre, description, priorité, assignee, deadline)
- Dialog édition de carte
- Suppression de carte
- Auto-increment des refs (PM-1, PM-2...) via Firestore increment
- Real-time : toute modification se propage instantanément aux autres membres

## Implementation Details

### Files to Create/Modify

- `src/routes/projects/$projectId/index.tsx` — Page board
- `src/components/board/kanban-board.tsx` — Board principal avec DndContext
- `src/components/board/kanban-column.tsx` — Colonne avec SortableContext
- `src/components/board/kanban-card.tsx` — Carte draggable avec useSortable
- `src/components/board/create-card-dialog.tsx` — Dialog création
- `src/components/board/edit-card-dialog.tsx` — Dialog édition
- `src/lib/firestore.ts` — Ajouter : createCard, updateCard, deleteCard, moveCard, useProjectCards

### Key Functionality

**Board Layout** :
- Header : nom du projet + bouton settings
- 4 colonnes côte à côte (horizontal scroll sur mobile)
- Chaque colonne : titre + compteur de cartes + bouton "+" + liste de cartes

**Drag & Drop (dnd-kit)** :
- `DndContext` au niveau du board
- `SortableContext` par colonne (strategy: verticalListSortingStrategy)
- `useSortable` sur chaque carte
- `DragOverlay` pour le ghost pendant le drag
- `onDragEnd` : détecter si changement de colonne → updateCard(status, order), sinon juste réordonner

**createCard(projectId, data)** :
1. Lire `cardCounter` du projet (Firestore transaction)
2. Incrémenter cardCounter atomiquement
3. Créer la carte avec `ref: "PM-{counter}"`, `status: "backlog"`, `order: 0`
4. Recalculer les orders des cartes dans la colonne backlog

**moveCard(cardId, newStatus, newOrder)** :
1. Mettre à jour status et order de la carte
2. Recalculer les orders des cartes affectées (ancienne et nouvelle colonne)

**Real-time** :
- `useProjectCards(projectId)` → onSnapshot sur `/projects/{projectId}/cards` collection
- Grouper les cartes par status côté client
- Trier par order au sein de chaque groupe

**Carte UI** :
- Ref (PM-1) en badge
- Titre
- Priorité (badge coloré)
- Assignee (avatar ou initiales)
- Deadline (si définie, en rouge si dépassée)

### Technologies Used
- dnd-kit (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities)
- Firestore (onSnapshot, runTransaction pour l'increment atomique, batch writes pour le reorder)
- shadcn/ui (Card, Dialog, Input, Textarea, Select, Badge, Avatar, Button, Calendar/DatePicker)
- Lucide icons (déjà installé)

### Architectural Patterns
- Firestore client direct (ADR-002)
- Real-time via onSnapshot — pas de polling
- Transactions Firestore pour les opérations atomiques (cardCounter increment)
- Batch writes pour le reorder de multiples cartes

## Success Criteria
- [ ] Le board affiche 4 colonnes : Backlog, En cours, À tester, Fini
- [ ] On peut créer une carte avec titre, description, priorité
- [ ] La carte apparaît avec sa ref (PM-1, PM-2...)
- [ ] On peut drag & drop une carte entre colonnes
- [ ] On peut drag & drop une carte au sein d'une colonne (réordonner)
- [ ] On peut éditer une carte (titre, description, priorité, assignee, deadline)
- [ ] On peut supprimer une carte
- [ ] Les modifications sont real-time (ouvrir 2 onglets, voir les changements)
- [ ] La priorité est affichée en couleur sur la carte
- [ ] La deadline est affichée et en rouge si dépassée

## Testing & Validation

### Manual Testing Steps
1. Ouvrir un projet → board vide avec 4 colonnes
2. Créer une carte "Implémenter le login" en priorité haute → apparaît en Backlog avec ref PM-1
3. Créer une 2e carte → ref PM-2
4. Drag PM-1 de Backlog vers "En cours" → le status change
5. Ouvrir un 2e onglet → les 2 cartes sont visibles au bon endroit
6. Drag PM-2 au-dessus de PM-1 dans Backlog → l'ordre est persisté
7. Éditer PM-1 : changer le titre → le changement apparaît dans le 2e onglet
8. Supprimer PM-2 → disparaît des 2 onglets

### Edge Cases
- Drag & drop rapide (debounce les writes Firestore)
- 2 users qui drag la même carte en même temps (last write wins, acceptable pour MVP)
- Colonne vide (doit rester droppable)
- Carte sans description (optionnel)
- Beaucoup de cartes dans une colonne (scroll vertical)

## Dependencies

**Must complete first**:
- Task 01: Foundation (Firebase, types, dnd-kit, shadcn)
- Task 02: Auth (user connecté)
- Task 03: Projects (projet existant)

**Blocks**:
- Task 06: MCP Server (tools card CRUD réutilisent la même logique)

## Related Documentation
- **PRD**: Core Feature #1 (Kanban Board), User Flows
- **ARCHI**: Data Model (/cards), Drag & Drop section, Real-time strategy

---
**Estimated Time**: 3h
**Phase**: Core Features
