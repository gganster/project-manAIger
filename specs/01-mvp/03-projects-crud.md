# Task 03: CRUD Projets (créer, lister, inviter, settings)

## Context
PRD Feature #1 : Kanban Board Multi-Projet. Un utilisateur peut créer plusieurs projets et inviter des membres. Les rôles sont admin (créateur) et user (invité). Cette tâche couvre le CRUD projets et la gestion des membres, pas le board kanban lui-même.

## Scope
- Page liste des projets (/projects)
- Dialog création de projet (nom)
- Page settings projet (/projects/$projectId/settings)
- Invitation de membres par email
- Gestion des rôles (admin/user)
- Sidebar avec navigation entre projets
- Suppression de projet (admin only)

## Implementation Details

### Files to Create/Modify

- `src/routes/projects/index.tsx` — Liste des projets de l'utilisateur
- `src/routes/projects/$projectId/settings.tsx` — Settings du projet (membres, GitHub config)
- `src/components/project/project-list.tsx` — Grille/liste de projets avec bouton créer
- `src/components/project/create-project-dialog.tsx` — Dialog de création
- `src/components/project/project-settings.tsx` — Formulaire settings + liste membres
- `src/components/project/invite-member-dialog.tsx` — Dialog invitation par email
- `src/components/layout/sidebar.tsx` — Sidebar avec liste projets + navigation
- `src/lib/firestore.ts` — Ajouter : createProject, getUserProjects, updateProject, deleteProject, inviteMember

### Key Functionality

**createProject(name, userId)**:
1. Générer un slug à partir du nom
2. Créer le doc /projects/{id} avec `members: { [userId]: "admin" }`, `cardCounter: 0`
3. Redirect vers /projects/{id}

**getUserProjects(userId)**:
- Query Firestore : projets où `members.{userId}` existe
- Real-time via onSnapshot

**inviteMember(projectId, email, role)**:
- Chercher le user par email dans /users (query where email == email)
- Ajouter son uid dans members du projet
- Si user pas trouvé → erreur "Cet utilisateur n'a pas de compte"

**deleteMember / updateRole** : modifier le map members

**Page projets** : grille de cards avec nom du projet, nombre de cartes (placeholder), nombre de membres. Bouton "+" pour créer.

**Settings** : onglet Membres (liste avec rôle, bouton supprimer/changer rôle) + onglet GitHub (champs owner/repo, sauvegarde dans settings.github).

### Technologies Used
- Firestore client SDK (collection queries, onSnapshot, setDoc, updateDoc, deleteDoc)
- shadcn/ui (Card, Dialog, Input, Button, Select, Avatar, Badge)
- TanStack Router (routes typées, params $projectId)

### Architectural Patterns
- Firestore client direct pour le CRUD (ADR-002)
- Real-time via onSnapshot pour la liste projets
- Rôles stockés dans le document projet (pas de collection séparée)

## Success Criteria
- [ ] Un user peut créer un projet avec un nom
- [ ] La liste des projets affiche tous les projets dont l'utilisateur est membre
- [ ] Un admin peut inviter un membre par email
- [ ] Un admin peut changer le rôle d'un membre (admin/user)
- [ ] Un admin peut retirer un membre
- [ ] Un admin peut supprimer un projet
- [ ] Un user non-admin ne voit pas les actions admin
- [ ] La page settings permet de configurer le repo GitHub (owner/repo)
- [ ] La sidebar affiche les projets et permet de naviguer entre eux

## Testing & Validation

### Manual Testing Steps
1. Se connecter → page projets vide
2. Créer un projet "Mon App" → apparaît dans la liste
3. Cliquer sur le projet → arrive sur le board (vide pour l'instant)
4. Aller dans settings → voir les membres (juste soi en admin)
5. Inviter un deuxième user (doit s'être inscrit avant)
6. Vérifier que le deuxième user voit le projet dans sa liste
7. Configurer GitHub owner/repo dans settings → sauvegardé

### Edge Cases
- Inviter un email qui n'existe pas → erreur claire
- Inviter quelqu'un déjà membre → erreur ou no-op
- Dernier admin ne peut pas se retirer
- Slug duplicates (ajouter un suffix si nécessaire)

## Dependencies

**Must complete first**:
- Task 01: Foundation (Firebase, types)
- Task 02: Auth flow (user connecté)

**Blocks**:
- Task 04: Kanban Board (nécessite un projet)
- Task 05: Cards CRUD (nécessite un projet)

## Related Documentation
- **PRD**: Core Feature #1 (Kanban Board Multi-Projet), Flow Admin
- **ARCHI**: Data Model (/projects), Firestore Security Rules

---
**Estimated Time**: 2.5h
**Phase**: Core Features
