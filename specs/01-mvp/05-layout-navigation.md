# Task 05: Layout global, sidebar et navigation

## Context
L'app a besoin d'un layout cohérent avec une sidebar pour naviguer entre projets, un header avec info user/déconnexion, et une navigation fluide. Cette tâche unifie le layout des pages créées dans les tâches précédentes.

## Scope
- Layout racine avec sidebar + header + zone de contenu
- Sidebar : liste des projets (real-time), projet actif surligné, lien settings
- Header : nom du projet actif, avatar user, menu déconnexion
- Navigation entre projets fluide
- Responsive : sidebar collapsible sur mobile
- Style global cohérent (couleurs, spacing, typographie)

## Implementation Details

### Files to Create/Modify

- `src/routes/__root.tsx` — Layout racine avec auth guard + sidebar + header
- `src/components/layout/sidebar.tsx` — Sidebar avec liste projets
- `src/components/layout/header.tsx` — Header avec breadcrumb + user menu
- `src/components/layout/app-layout.tsx` — Wrapper layout (sidebar + main content)
- `src/styles.css` — Variables CSS, thème global

### Key Functionality

**Sidebar** :
- Logo/nom de l'app en haut
- Liste des projets de l'utilisateur (real-time via onSnapshot)
- Projet actif surligné (basé sur l'URL $projectId)
- Bouton "+" pour créer un projet (ouvre le dialog de task 03)
- Icône settings par projet (lien vers /projects/$projectId/settings)
- Collapsible sur mobile (hamburger menu)

**Header** :
- Breadcrumb contextuel : Projets > Mon App > Board
- À droite : avatar/initiales de l'utilisateur + dropdown (profil, déconnexion)

**Layout structure** :
```
┌─────────────────────────────────────┐
│ Header (breadcrumb + user menu)     │
├──────────┬──────────────────────────┤
│ Sidebar  │ Main content (Outlet)    │
│ (projets)│                          │
│          │                          │
└──────────┴──────────────────────────┘
```

### Technologies Used
- shadcn/ui (Sidebar, DropdownMenu, Avatar, Button, Sheet pour mobile)
- TanStack Router (useParams, Link, Outlet)
- Lucide icons
- Tailwind CSS

### Architectural Patterns
- Layout dans __root.tsx, contenu via Outlet
- Sidebar state en local (collapsed/expanded) via useState
- Projets chargés une seule fois au niveau root (partagés via context ou prop drilling)

## Success Criteria
- [ ] Le layout sidebar + header + contenu est visible sur toutes les pages authentifiées
- [ ] La sidebar affiche la liste des projets en real-time
- [ ] Le projet actif est surligné dans la sidebar
- [ ] On peut naviguer entre projets via la sidebar
- [ ] Le header affiche le nom du projet actif
- [ ] Le menu utilisateur permet de se déconnecter
- [ ] Sur mobile, la sidebar est collapsible
- [ ] Les pages login/register n'ont PAS de sidebar

## Testing & Validation

### Manual Testing Steps
1. Se connecter → layout avec sidebar visible
2. Créer 2 projets → les 2 apparaissent dans la sidebar
3. Cliquer sur le 2e → le contenu change, le 2e est surligné
4. Cliquer sur le menu user → option déconnexion visible
5. Réduire la fenêtre → la sidebar se collapse
6. Se déconnecter → page login sans sidebar

### Edge Cases
- 0 projets → sidebar avec juste le bouton "+"
- Nom de projet très long → truncate avec ellipsis
- Refresh sur /projects/xyz → le bon projet est surligné

## Dependencies

**Must complete first**:
- Task 01: Foundation (shadcn)
- Task 02: Auth (auth guard, user context)
- Task 03: Projects (liste projets)

**Blocks**: Aucun (polish / intégration)

## Related Documentation
- **PRD**: User Flows (navigation)
- **ARCHI**: Folder Structure (layout/), Routes

---
**Estimated Time**: 1.5h
**Phase**: Core Features
