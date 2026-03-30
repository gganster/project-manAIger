# Product Requirements Document: ProjectFlow

## Product Vision

**Problem Statement**
La gestion de projet pour les petites équipes dev (2-5 personnes) est une corvée manuelle. Les devs passent leur temps à mettre à jour des boards Trello/Jira alors que l'état réel du projet est déjà dans Git. Les cartes sont rarement à jour, personne ne déplace ses tickets, et le board finit par ne plus refléter la réalité.

**Solution**
ProjectFlow est un kanban dev-native qui s'auto-actualise en fonction de l'état du repository Git. Via un serveur MCP exposant tools et prompts, les actions de gestion de projet se déclenchent naturellement depuis le workflow dev (commit, push, branch). Le board se maintient à jour tout seul.

**Success Criteria**
- 80% des cartes se déplacent automatiquement sans intervention manuelle
- Temps moyen de mise à jour manuelle du board < 2 min/jour par dev
- 0 carte "oubliée" en statut incorrect pendant plus de 24h

## Target Users

### Primary Persona: Alex — Lead Dev / Tech Lead
- **Role**: Lead dev dans une équipe de 2-5 personnes, utilise Claude Code quotidiennement
- **Pain Points**:
  - Passe du temps à demander à l'équipe de mettre à jour le board
  - Le board Trello ne reflète jamais l'état réel du projet
  - Doit faire le tour des PRs GitHub pour comprendre l'avancement
- **Motivations**: Avoir une vue projet fiable sans effort de maintenance
- **Goals**: Savoir en un coup d'oeil où en est le projet, sans micro-manager

### Secondary Persona: Sam — Dev de l'équipe
- **Role**: Dev contributeur, fait des branches, commit, push, ouvre des PRs
- **Pain Points**: Déteste devoir ouvrir Trello pour déplacer une carte après chaque PR
- **Motivations**: Coder sans friction administrative — le board se met à jour tout seul

## Core Features (MVP)

### Must-Have Features

#### 1. Kanban Board Multi-Projet
**Description**: Board kanban classique avec 4 colonnes fixes (Backlog, En cours, À tester, Fini). Chaque carte a un titre, description, assignation optionnelle, deadline optionnelle, et priorité. Un utilisateur peut créer plusieurs projets et inviter des membres (rôles: admin/user).
**User Value**: Vue centralisée et simple de l'état du projet pour toute l'équipe.
**Success Metric**: Un projet avec des cartes peut être créé et partagé en moins de 2 minutes.

#### 2. Serveur MCP (Tools + Prompts)
**Description**: Serveur MCP exposant des tools CRUD (créer/déplacer/lister/modifier des cartes, gérer les projets) et des prompts intelligents. Les prompts permettent de déclencher des actions contextuelles — par exemple quand un dev dit "commit & push feature X", le prompt détecte la tâche associée et met à jour le board via les tools.
**User Value**: Le dev n'a jamais besoin de quitter son terminal ou son IDE. La gestion de projet se fait naturellement dans le flow de travail.
**Success Metric**: 80% des déplacements de cartes se font via MCP sans ouvrir le dashboard web.

#### 3. Détection Git → Carte (via Prompts MCP)
**Description**: Via les prompts MCP exposés, le système peut : (1) à la mention d'un commit/push, détecter la tâche associée et la déplacer (ex: merge dans main → carte en "Fini"), (2) à la création d'une branche nommée selon une convention (ex: `feat/PM-12-login`), déplacer la carte en "En cours" ou créer la carte si elle n'existe pas.
**User Value**: Le board s'auto-actualise en fonction du workflow Git réel — plus besoin de penser à mettre à jour les cartes.
**Success Metric**: 80% des transitions de cartes sont automatiques.

#### 4. Auth & Multi-Tenant
**Description**: Authentification via Firebase Auth. Chaque utilisateur peut créer des projets, inviter des membres. Données stockées dans Firestore avec isolation par projet. Rôles : admin (CRUD projet + membres) et user (CRUD cartes).
**User Value**: Chaque équipe a son espace, les projets sont isolés, les permissions sont claires.
**Success Metric**: Un utilisateur peut s'inscrire, créer un projet et inviter un collègue en moins de 3 minutes.

### Should-Have Features (Post-MVP)

- **GitHub Webhooks automatiques (MVP V2)**: Agent déclenché par webhook GitHub (via n8n) qui déplace automatiquement les cartes sans intervention Claude — full automatique
- **Intégration Discord**: Notifications dans un channel Discord quand une carte change de statut
- **Dashboard analytics**: Vue d'ensemble de la vélocité, cartes complétées par sprint, etc.
- **Labels / Tags sur les cartes**: Catégorisation des tâches (bug, feature, chore)
- **Commentaires sur les cartes**: Discussion contextuelle par tâche
- **Filtres et recherche avancée**: Filtrer par assigné, priorité, deadline

## User Flows

### Flow Principal : Dev qui travaille sur une feature
1. Lead crée une carte "Implémenter le login" dans Backlog via le dashboard web
2. Dev dit à Claude : "je commence la tâche login" → le prompt MCP détecte la carte, la déplace en "En cours"
3. Dev crée la branche `feat/PM-3-login`, code, commit, push
4. Dev dit à Claude : "c'est mergé dans main" → le prompt MCP déplace la carte en "Fini"

### Flow Secondaire : Création automatique de carte
1. Dev crée une branche `fix/crash-on-startup` sans carte existante
2. Via le prompt MCP, le système détecte qu'aucune carte ne correspond
3. Une carte "Fix crash on startup" est créée automatiquement en "En cours"

### Flow Admin : Setup du projet
1. L'admin s'inscrit via Firebase Auth
2. Crée un nouveau projet "MonApp"
3. Invite 2 collègues par email
4. L'équipe commence à utiliser le board

## Out of Scope (v1)

Explicitly NOT building in MVP:
- **GitHub Webhooks / agents automatiques** — MVP V1 reste sur du prompting MCP déclenché manuellement
- **Intégrations Discord, Slack, etc.** — GitHub only, et même GitHub est via MCP pas via API directe
- **Billing / pricing / plans** — tout est gratuit pour le MVP
- **Colonnes personnalisables** — les 4 colonnes sont fixes
- **Sous-tâches / checklists** dans les cartes
- **Drag & drop** sophistiqué — nice to have mais pas bloquant
- **App mobile** — web only
- **Notifications email/push**
- **Historique d'activité / audit log**

## Open Questions

- Convention de nommage des branches à supporter ? (ex: `feat/PM-{id}-{slug}`, `fix/{slug}`, libre ?)
- Le MCP server tourne en local avec Claude Code — comment gérer l'auth Firestore depuis le MCP ? (service account ? token utilisateur ?)
- Faut-il un système d'ID de carte visible (PM-1, PM-2...) pour faciliter la détection dans les noms de branches/commits ?

## Success Metrics

**Primary Metrics**:
- **Taux d'automatisation**: 80% des déplacements de cartes se font sans intervention manuelle sur le dashboard
- **Adoption MCP**: L'équipe utilise les prompts MCP quotidiennement pour interagir avec le board

**Secondary Metrics**:
- **Time-to-setup**: < 3 minutes pour créer un projet et inviter l'équipe
- **Board accuracy**: Le board reflète l'état réel du Git à tout moment (< 24h de décalage)

## Timeline & Milestones

- **MVP V1 (J+2)**: Dashboard kanban fonctionnel + MCP server avec tools CRUD + prompts de détection Git
- **MVP V2 (J+7)**: GitHub webhooks via n8n pour automatisation complète sans Claude local
- **V1 publique**: Intégrations Discord + analytics + polish UX

## Stack Technique

- **Frontend**: TanStack Start (React) — déjà initialisé
- **Backend/DB**: Firebase (Firestore + Auth)
- **MCP Server**: TypeScript, expose tools + prompts pour Claude Code
- **Future**: n8n pour orchestration webhook GitHub → agent
