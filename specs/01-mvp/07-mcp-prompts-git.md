# Task 07: MCP Prompts — Détection Git et actions automatiques

## Context
PRD Feature #3 : Détection Git → Carte. C'est le différenciateur clé de ProjectFlow. Les prompts MCP permettent aux devs de dire "je commence la tâche login" ou "c'est mergé dans main" et le board se met à jour automatiquement. C'est ce qui permet d'atteindre l'objectif de 80% de cartes auto-déplacées.

## Scope
- Prompt `commit_and_push` : détecte la tâche liée, met à jour le status (merge main → done)
- Prompt `start_task` : identifie une carte par nom/ref, la passe en "in_progress"
- Prompt `create_branch` : associe une branche à une carte ou en crée une nouvelle
- Prompt `project_status` : résumé lisible de l'état du projet
- Logique de matching : ref exacte (PM-12) + fuzzy matching par titre

## Implementation Details

### Files to Create

- `mcp-server/src/prompts/commit-and-push.ts` — Prompt commit & push
- `mcp-server/src/prompts/start-task.ts` — Prompt start task
- `mcp-server/src/prompts/create-branch.ts` — Prompt create branch
- `mcp-server/src/prompts/project-status.ts` — Prompt project status
- `mcp-server/src/lib/matching.ts` — Logique de matching carte ↔ texte/branche

### Key Functionality

**Matching logic (matching.ts)** :
- **Match par ref** : extraire "PM-{number}" d'un texte (commit message, nom de branche, texte libre)
  - Regex : `/PM-(\d+)/i`
  - Exemple : "feat/PM-12-login" → match PM-12
- **Match par titre** : si pas de ref, chercher par similarité de titre
  - Normaliser (lowercase, remove special chars)
  - Chercher une carte dont le titre slug-ifié est contenu dans le texte
  - Exemple : "je commence la tâche login" + carte "Implémenter le login" → match possible
- Retourner : `{ card: Card | null, confidence: "exact" | "fuzzy" | "none" }`

**Prompt `commit_and_push`** :
- Arguments : `projectId`, `commitMessage`, `branch?`, `mergedToMain?: boolean`
- Logique :
  1. Extraire la ref ou titre du commit message
  2. Chercher la carte correspondante
  3. Si `mergedToMain` → move card to "done"
  4. Si pas merged → move card to "testing"
  5. Retourner un message confirmant l'action
- Le prompt guide Claude pour extraire les infos du contexte de conversation

**Prompt `start_task`** :
- Arguments : `projectId`, `taskIdentifier` (ref ou titre partiel)
- Logique :
  1. Chercher la carte par ref ou titre
  2. Si trouvée → move to "in_progress"
  3. Si pas trouvée → proposer de créer la carte
- Retourner confirmation + ref de la carte

**Prompt `create_branch`** :
- Arguments : `projectId`, `branchName`
- Logique :
  1. Parser le nom de branche (ex: `feat/PM-12-login`, `fix/crash-on-startup`)
  2. Chercher la carte correspondante
  3. Si trouvée → move to "in_progress", set gitBranch
  4. Si pas trouvée → créer la carte automatiquement en "in_progress" avec le titre déduit du nom de branche
- Convention de branche : `{type}/PM-{ref}-{slug}` ou `{type}/{slug}`

**Prompt `project_status`** :
- Arguments : `projectId`
- Retourne un résumé formaté :
  ```
  📋 Projet: Mon App

  Backlog (3): PM-1 Login, PM-4 Dashboard, PM-7 Settings
  En cours (2): PM-2 Auth API, PM-5 Sidebar
  À tester (1): PM-3 Register
  Fini (4): PM-6 Setup, PM-8 Types, PM-9 Firebase, PM-10 Layout

  Total: 10 cartes | 40% complétées
  ```

### Technologies Used
- @modelcontextprotocol/sdk (prompts registration)
- Firebase Admin SDK (Firestore queries)
- Les tools de Task 06 (move_card, create_card) sont réutilisés par les prompts

### Architectural Patterns
- Les prompts sont des templates que Claude utilise pour comprendre le contexte et déclencher les tools appropriés
- Le matching est déterministe pour les refs (PM-X), fuzzy pour les titres
- Les prompts retournent du texte formaté que Claude peut interpréter

## Success Criteria
- [ ] `start_task` avec "PM-3" → la carte PM-3 passe en "in_progress"
- [ ] `start_task` avec "login" → trouve la carte contenant "login" dans le titre
- [ ] `commit_and_push` avec mergedToMain=true → la carte passe en "done"
- [ ] `create_branch` avec "feat/PM-5-sidebar" → PM-5 passe en "in_progress" + gitBranch set
- [ ] `create_branch` avec "fix/crash-on-startup" (pas de carte) → nouvelle carte créée en "in_progress"
- [ ] `project_status` retourne un résumé lisible avec compteurs par colonne
- [ ] Le matching par ref est exact et fiable
- [ ] Le matching par titre fonctionne pour des cas simples

## Testing & Validation

### Manual Testing Steps
1. Créer quelques cartes via le dashboard (PM-1, PM-2, PM-3)
2. Dans Claude Code, dire "je commence PM-2" → la carte passe en "in_progress" dans le dashboard
3. Dire "c'est mergé dans main" → la carte passe en "done"
4. Dire "je crée une branche fix/bug-header" → nouvelle carte créée
5. Demander "quel est l'état du projet ?" → résumé avec les compteurs

### Edge Cases
- Pas de carte trouvée → message clair, proposer de créer
- Plusieurs cartes avec des titres similaires → retourner les candidats, demander confirmation
- Carte déjà au bon status (ex: start_task sur une carte déjà "in_progress") → no-op avec message
- Ref invalide (PM-999 n'existe pas) → erreur claire

## Dependencies

**Must complete first**:
- Task 06: MCP Server Tools (les prompts appellent les tools)

**Blocks**: Aucun (dernière tâche du MVP)

## Related Documentation
- **PRD**: Core Feature #3 (Détection Git → Carte), User Flows
- **ARCHI**: MCP Server Prompts section, ADR-004 (Card refs)

---
**Estimated Time**: 2.5h
**Phase**: Integration
