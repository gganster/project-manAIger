# Task 06: MCP Server — Setup et Tools CRUD

## Context
PRD Feature #2 : Serveur MCP. Le MCP server permet aux devs d'interagir avec le board depuis Claude Code sans ouvrir le dashboard. Il expose des tools CRUD pour gérer les projets et cartes via Firebase Admin SDK.

## Scope
- Setup du package MCP server séparé (mcp-server/)
- Configuration Firebase Admin SDK avec service account
- Tools CRUD : list_projects, list_cards, create_card, update_card, move_card, delete_card, get_project_summary
- Types partagés avec le frontend
- Build & configuration pour Claude Code

## Implementation Details

### Files to Create

- `mcp-server/package.json` — Package avec deps (MCP SDK, Firebase Admin)
- `mcp-server/tsconfig.json` — Config TypeScript
- `mcp-server/src/index.ts` — Entry point, enregistrement des tools et prompts
- `mcp-server/src/lib/firebase-admin.ts` — Init Admin SDK avec service account
- `mcp-server/src/lib/types.ts` — Types (copie ou import des types partagés)
- `mcp-server/src/tools/projects.ts` — Tools : list_projects
- `mcp-server/src/tools/cards.ts` — Tools : list_cards, create_card, update_card, move_card, delete_card, get_project_summary

### Key Functionality

**MCP Server setup** :
- Utiliser `@modelcontextprotocol/sdk` (MCP TypeScript SDK)
- Transport stdio (lancé par Claude Code)
- Enregistrer tous les tools avec schemas Zod

**Firebase Admin init** :
- Charger le service account depuis une variable d'env ou fichier local
- Init `admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })`
- Export `db = admin.firestore()`

**Tools** :

| Tool | Params | Action |
|------|--------|--------|
| `list_projects` | `userId?: string` | Liste tous les projets (ou ceux d'un user) |
| `list_cards` | `projectId, status?: CardStatus` | Liste les cartes d'un projet, filtrable par status |
| `create_card` | `projectId, title, description?, priority?, assigneeId?` | Crée une carte en backlog avec ref auto-incrémentée |
| `update_card` | `projectId, cardId, fields...` | Met à jour les champs d'une carte |
| `move_card` | `projectId, cardId, newStatus` | Déplace une carte vers un nouveau status |
| `delete_card` | `projectId, cardId` | Supprime une carte |
| `get_project_summary` | `projectId` | Retourne le nb de cartes par colonne |

**create_card** doit :
1. Utiliser une transaction pour incrémenter atomiquement cardCounter
2. Générer ref "PM-{counter}"
3. Calculer order (mettre en dernier dans backlog)

### Technologies Used
- @modelcontextprotocol/sdk (MCP TypeScript SDK)
- firebase-admin (Admin SDK)
- Zod (validation des inputs des tools)
- tsx (pour run en dev)

### Architectural Patterns
- MCP via Admin SDK direct → Firestore (ADR-003)
- Service account pour l'auth (pas de user token)
- Chaque tool est une fonction async qui retourne du texte formaté
- Les tools partagent la même instance Firestore

## Success Criteria
- [ ] Le MCP server compile et se lance (`npx tsx mcp-server/src/index.ts`)
- [ ] `list_projects` retourne la liste des projets
- [ ] `list_cards` retourne les cartes d'un projet
- [ ] `create_card` crée une carte avec ref auto-incrémentée
- [ ] `move_card` change le status d'une carte
- [ ] `update_card` met à jour les champs d'une carte
- [ ] `delete_card` supprime une carte
- [ ] `get_project_summary` retourne le compteur par colonne
- [ ] Le serveur est configurable dans claude_desktop_config.json / Claude Code settings

## Testing & Validation

### Manual Testing Steps
1. Configurer le service account Firebase
2. Lancer le MCP server en mode debug
3. Utiliser le MCP Inspector ou Claude Code pour tester chaque tool
4. Créer une carte via MCP → vérifier qu'elle apparaît dans le dashboard web
5. Déplacer une carte via MCP → vérifier le changement dans le dashboard

### Edge Cases
- Service account manquant → erreur claire au démarrage
- projectId invalide → erreur retournée par le tool
- Créer une carte dans un projet qui n'existe pas
- cardCounter concurrent (transaction Firestore gère)

## Dependencies

**Must complete first**:
- Task 01: Foundation (types partagés)
- Task 04: Kanban Board (pour tester que les cartes MCP apparaissent dans le dashboard)

**Blocks**:
- Task 07: MCP Prompts (les prompts utilisent les tools)

## Related Documentation
- **PRD**: Core Feature #2 (Serveur MCP)
- **ARCHI**: MCP Server section, Tools exposés, ADR-003

---
**Estimated Time**: 2.5h
**Phase**: Integration
