# Suivi Chantier — Frontend

Interface Next.js 16 (App Router, React 19, TypeScript, Tailwind 4) de l'app de suivi de chantier. Voir le [README racine](../README.md) pour la vue d'ensemble du projet (backend, base de données, LLM, flux métiers).

## Démarrage

```bash
npm install
npm run dev
```

UI sur `http://localhost:3000`. Le backend (`cd ../backend && dotnet run`) doit tourner sur `http://localhost:5096`.

Le front ne parle jamais au backend en cross-origin : les rewrites de `next.config.ts` proxifient `/api/*` vers `BACKEND_INTERNAL_URL` (défaut `http://localhost:5096`). C'est ce qui permet au cookie d'auth ASP.NET, scopé sur l'origine du front, de circuler avec chaque requête.

> **En production**, `BACKEND_INTERNAL_URL` doit être définie **au moment du `next build`** : la destination des rewrites est figée dans `routes-manifest.json`. Sans elle, le build échoue volontairement plutôt que de graver `localhost:5096`.

## Structure

```
src/
├── app/
│   ├── (auth)/       # login, signup — layout dédié, hors chrome de l'app
│   ├── (app)/
│   │   ├── page.tsx      # Tableau de bord (budget, lots, avancement)
│   │   ├── devis/        # Liste, détail ([id]), import
│   │   ├── factures/     # Liste, détail + comparaison ([id]/comparaison)
│   │   ├── entreprises/  # Gestion des entreprises
│   │   ├── import/       # Import unifié (file d'attente multi-fichiers + polling)
│   │   ├── admin/        # comptes, llm, sante — onglets admin
│   │   ├── aide/         # Aide / FAQ (server component statique)
│   │   └── parametres/   # Profil, dates chantier, IA + RAZ de ses données (admin)
│   └── maintenance/  # Page statique servie par le rewrite MAINTENANCE_MODE
├── components/   # DevisModal, FactureModal, EntrepriseModal, ComparaisonTable,
│                 # ListTable, PdfUploadForm, PieceJointeUploadForm, EchangesLlm,
│                 # AdminUserModal, EntrepriseCombobox, Nav, BottomNav, TopBar,
│                 # UserMenu, StatusBadge, LoadState, Modal, ...
├── proxy.ts      # Rewrite MAINTENANCE_MODE + redirection vers /login sans cookie de session
└── lib/
    ├── api.ts       # Wrappers fetch typés (même origine, credentials: "include")
    ├── types.ts     # Miroirs TypeScript des DTOs C# + TYPE_LOT_LABELS/COLORS
    ├── format.ts    # Formatage dates/montants
    ├── status.ts    # Libellés/couleurs des statuts
    ├── useIsAdmin.ts
    ├── useMediaQuery.ts
    └── useParallax.ts
```

## Auth

`proxy.ts` fait un contrôle optimiste sur la simple présence du cookie `suivi_chantier_auth` — il ne le valide pas. Le vrai gardien est le `[Authorize]` côté backend ; un cookie expiré passe le proxy et se fait rattraper par le 401 intercepté dans `lib/api.ts`.

Sur un 401, `lib/api.ts` force d'abord un `POST /api/auth/logout` avant de rediriger vers `/login` : sans ce nettoyage, le cookie périmé mais toujours présent (HttpOnly) ferait boucler `proxy.ts` entre `/login` et `/`.

`useIsAdmin()` ne masque l'UI admin que par confort — le backend répond 403 sur `/api/admin/*` quoi qu'affiche le front, et les pages `/admin` affichent alors le message d'erreur.

## Appels API

Tous les appels passent par `lib/api.ts`, qui centralise :

- **L'origine** : `API_BASE = ""`. Les chemins sont relatifs et routés par le rewrite Next — il n'y a pas de variable `NEXT_PUBLIC_*` d'URL backend.
- **Les erreurs** : les corps en texte brut, les `ProblemDetails` JSON d'ASP.NET et les réponses vides sont ramenés à un message lisible unique (avec un repli par code HTTP : 400, 403, 404, 409, 413, 429).
- **Les 204** : renvoyés comme `undefined` sans tenter de parser du JSON.

## Uploads

Le plafond est de 25 Mo, à maintenir aligné sur `experimental.proxyClientMaxBodySize` (`next.config.ts`), `UploadLimits.MaxBytes` et `MaxRequestBodySize` (backend). `proxy.ts` fait bufferiser le corps par Next : au-delà de la limite du proxy, **le corps est tronqué sans erreur** et le backend reçoit un PDF corrompu.

## Tests

Aucun runner n'est configuré. `src/components/ListTable.test.tsx` est un script d'assertions autonome (vérifie que `ListTable` injecte bien un `data-label` par cellule, ce dont dépend le rendu en cartes sous 768 px) :

```bash
node --experimental-strip-types src/components/ListTable.test.tsx
```

## Notes

- Ce projet utilise Next.js 16, dont les APIs et conventions diffèrent des versions antérieures — voir `AGENTS.md` et `node_modules/next/dist/docs/` avant de modifier le routing ou les conventions de fichiers.
- Le style est massivement inline (pas de CSS Modules) ; `globals.css` porte les variables de thème `--nm-*` et les utilitaires responsive (`.page-shell`, `.table-to-cards`, `.hide-mobile`, `.stack-mobile`).
- Pas de CSP dans `next.config.ts` : le style inline la rendrait inapplicable. `X-Content-Type-Options: nosniff` est le garde-fou principal, les PDF et pièces jointes étant servis inline depuis la même origine.
