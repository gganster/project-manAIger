# Task 02: Authentication flow (login, register, auth guard)

## Context
PRD Feature #4 : Auth & Multi-Tenant. Chaque utilisateur doit pouvoir s'inscrire, se connecter, et accéder uniquement à ses projets. L'auth guard protège toutes les routes sauf login/register.

## Scope
- Page login (email/password)
- Page register (email/password + displayName)
- Auth guard sur le root layout (redirect vers /login si non connecté)
- Création du document user dans Firestore à l'inscription
- Context React pour l'état auth (currentUser)
- Page index redirige vers /projects si connecté

## Implementation Details

### Files to Create/Modify

- `src/routes/login.tsx` — Page de connexion
- `src/routes/register.tsx` — Page d'inscription
- `src/routes/__root.tsx` — Auth guard + layout avec sidebar
- `src/routes/index.tsx` — Redirect vers /projects ou /login
- `src/lib/auth.ts` — Helpers : signIn, signUp, signOut, useAuth hook
- `src/components/layout/auth-layout.tsx` — Layout centré pour login/register

### Key Functionality

**Auth helpers (src/lib/auth.ts)**:
- `signIn(email, password)` → Firebase signInWithEmailAndPassword
- `signUp(email, password, displayName)` → createUserWithEmailAndPassword + créer doc /users/{uid}
- `signOut()` → Firebase signOut
- `useAuth()` → hook React qui retourne `{ user, loading }` via onAuthStateChanged
- `AuthProvider` → Context provider wrappant l'app

**Auth Guard (__root.tsx)**:
- Si `loading` → spinner
- Si `!user` et route != login/register → redirect /login
- Si `user` et route == login/register → redirect /projects

**Login page** : formulaire email + password, lien vers register, gestion erreurs (bad credentials)

**Register page** : formulaire email + password + displayName, lien vers login, gestion erreurs (email déjà pris)

### Technologies Used
- Firebase Auth (signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged)
- Firestore (setDoc pour créer le user doc)
- shadcn/ui (Input, Button, Card)
- React Context

### Architectural Patterns
- Auth state via React Context + onAuthStateChanged listener
- Firestore Security Rules vérifient l'auth côté DB
- Pas de session server-side (SPA mode)

## Success Criteria
- [ ] Un utilisateur peut s'inscrire avec email/password/displayName
- [ ] À l'inscription, un document /users/{uid} est créé dans Firestore
- [ ] Un utilisateur peut se connecter avec email/password
- [ ] Les routes /projects/* redirigent vers /login si non connecté
- [ ] /login et /register redirigent vers /projects si déjà connecté
- [ ] Le bouton déconnexion fonctionne
- [ ] Les erreurs d'auth sont affichées (mauvais password, email déjà pris)

## Testing & Validation

### Manual Testing Steps
1. Aller sur /projects → redirigé vers /login
2. Cliquer "Créer un compte" → page register
3. S'inscrire → redirigé vers /projects
4. Se déconnecter → redirigé vers /login
5. Se reconnecter → redirigé vers /projects
6. Vérifier dans Firebase Console que le user et le doc Firestore existent

### Edge Cases
- Double inscription avec le même email
- Password trop court (Firebase minimum 6 chars)
- Refresh de la page → l'auth persiste (Firebase gère)

## Dependencies

**Must complete first**:
- Task 01: Foundation (Firebase SDK, types, shadcn)

**Blocks**:
- Task 03: Projects CRUD (nécessite un user connecté)

## Related Documentation
- **PRD**: Core Feature #4 (Auth & Multi-Tenant)
- **ARCHI**: Authentication & Authorization

---
**Estimated Time**: 1.5h
**Phase**: Foundation
