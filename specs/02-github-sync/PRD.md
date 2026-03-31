# Product Requirements Document: GitHub Sync

## Product Vision

**Problem Statement**
Les devs utilisent un kanban pour suivre leurs tâches mais doivent manuellement mettre à jour le statut des cartes quand ils créent des branches, ouvrent des PRs ou mergent du code. C'est une friction constante qui fait que le board ne reflète jamais l'état réel du projet.

**Solution**
Connecter un repository GitHub à un projet ProjectManAIger via OAuth + webhooks. L'IA (Claude API) analyse les événements Git en temps réel pour matcher les branches aux tâches existantes et mettre à jour automatiquement les statuts du kanban. L'utilisateur garde le contrôle total avec des overrides manuels.

## Target Users

### Primary Persona: Dev Lead
- **Role**: Lead technique d'une équipe de 2-5 devs, gère le board et le repo
- **Pain Points**:
  - Le board est toujours en retard par rapport au code
  - Perd du temps à mettre à jour manuellement les statuts des cartes
  - Ne sait jamais quelle branche correspond à quelle tâche
- **Motivations**: Un board qui se met à jour tout seul, fiable, sans effort
- **Goals**: Ne plus jamais toucher un statut de carte manuellement

### Secondary Persona: Dev Contributeur
- **Role**: Développeur dans l'équipe, crée des branches et pousse du code
- **Pain Points**:
  - Oublie de mettre à jour le board après un merge
  - Ne sait pas toujours quelle ref de carte mettre dans le nom de branche
- **Motivations**: Coder sans se soucier du board

## Core Features (MVP)

### Must-Have Features

#### 1. OAuth GitHub & sélection de repository
**Description**: Dans les paramètres du projet, l'utilisateur peut connecter son compte GitHub via OAuth. Une fois connecté, il sélectionne le repository à lier au projet. Le token OAuth est stocké au niveau de l'utilisateur (réutilisable). L'état de la connexion GitHub est visible dans le profil utilisateur.
**User Value**: Connexion simple et sécurisée, pas besoin de configurer manuellement des tokens ou des webhooks.

#### 2. Configuration automatique du webhook
**Description**: Une fois le repository sélectionné, l'application crée automatiquement un webhook GitHub sur le repo pour écouter les événements : `create` (branches), `pull_request` (merge). Le webhook pointe vers un endpoint de notre serveur qui reçoit et traite les événements.
**User Value**: Zero configuration manuelle côté GitHub.

#### 3. Matching IA branche → tâche
**Description**: Quand un événement de création de branche arrive, l'IA (Claude API) analyse le nom de la branche et les titres des tâches existantes du projet pour trouver une correspondance. Si match trouvé : la branche est liée à la tâche, statut → `in_progress`. Si aucun match : une nouvelle carte est créée avec le nom de la branche, statut `in_progress`.
**User Value**: Les cartes bougent automatiquement sans intervention humaine.

#### 4. Gestion automatique des statuts sur merge
**Description**: Les merges déclenchent des changements de statut automatiques :
- Merge d'une branche dans `dev` → carte passe en `testing`
- Merge d'une branche dans `main` → carte passe en `done`
- Merge de `dev` dans `main` → toutes les cartes `testing` liées à des branches mergées dans `dev` passent en `done`
**User Value**: Le board reflète l'état réel du code à tout moment.

#### 5. Override manuel branche ↔ tâche
**Description**: L'utilisateur peut manuellement lier ou délier une branche d'une carte depuis l'UI de la carte. Le champ `gitBranch` existant sur les cartes est utilisé. L'utilisateur peut aussi corriger le statut manuellement (déjà implémenté).
**User Value**: Filet de sécurité quand l'IA se trompe sur le matching.

### Should-Have Features (Post-MVP)
- **Historique des événements webhook** : log des événements reçus et actions effectuées pour debug
- **Support des commit messages** : détecter `fixes PM-42` ou `closes PM-42` dans les commits
- **Notifications** : alerter l'équipe sur Slack/email quand une carte change de statut automatiquement
- **Multi-repo** : lier plusieurs repos à un même projet

## User Flows

### Flow 1: Connexion GitHub
1. Admin va dans Paramètres du projet → section GitHub
2. Clique "Connecter GitHub"
3. OAuth GitHub s'ouvre → l'utilisateur autorise l'app
4. Liste des repos s'affiche → sélectionne le repo
5. Webhook est créé automatiquement sur le repo
6. Confirmation affichée, repo lié au projet

### Flow 2: Création de branche → carte en cours
1. Dev crée une branche `feature/PM-12-user-profile` sur le repo
2. GitHub envoie un webhook `create` à notre serveur
3. Le serveur extrait le nom de la branche
4. Claude API analyse le nom vs les cartes existantes du projet
5. Match trouvé avec PM-12 → branche liée, statut → `in_progress`
6. Le board se met à jour en temps réel pour toute l'équipe

### Flow 3: Merge dans dev → carte en testing
1. Dev merge sa branche dans `dev` via PR
2. GitHub envoie un webhook `pull_request` (merged, base=dev)
3. Le serveur identifie la branche source et la carte liée
4. Statut de la carte → `testing`

### Flow 4: Merge dans main → carte terminée
1. Lead merge `dev` dans `main` ou une branche directement dans `main`
2. GitHub envoie un webhook `pull_request` (merged, base=main)
3. Si branche unique → carte liée passe en `done`
4. Si `dev` → `main` → toutes les cartes `testing` passent en `done`

### Flow 5: Override manuel
1. L'utilisateur ouvre une carte sur le board
2. Dans le champ "Branche Git", il peut taper/sélectionner une branche ou supprimer le lien existant
3. Le statut peut être changé manuellement via drag & drop (déjà existant)

## Out of Scope (v1)

- Support GitLab / Bitbucket
- Notifications email / Slack
- Actions basées sur les commits individuels
- Historique/log des événements webhook (nice-to-have, pas MVP)
- Multi-repo par projet
- GitHub Actions / CI status sur les cartes
- Review de PR → changement de statut

## Contraintes techniques

- **OAuth GitHub** : GitHub App ou OAuth App, token stocké dans Firestore sur le document user
- **Webhook endpoint** : server function TanStack Start (POST), vérification signature HMAC GitHub
- **IA matching** : Claude API (`CLAUDE_API_KEY` en env), appel synchrone à la réception du webhook
- **Dev local** : script npm avec ngrok pour exposer le serveur local et recevoir les webhooks GitHub
- **Branche cible** : le matching se base sur les refs de cartes (PM-XX) dans le nom de branche, avec fallback IA sur le titre si pas de ref explicite

## Timeline

- **Target** : 1 heure
- Priorité d'implémentation :
  1. OAuth GitHub + stockage token
  2. Sélection repo + création webhook automatique
  3. Endpoint webhook + routing des événements
  4. Matching IA branche → tâche (Claude API)
  5. Actions automatiques sur merge (dev/main)
  6. UI override branche sur les cartes
  7. Profil utilisateur : état connexion GitHub
