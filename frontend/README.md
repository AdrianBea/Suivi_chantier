# Suivi Chantier — Frontend

Interface Next.js 16 (App Router, React 19, TypeScript, Tailwind 4) de l'app de suivi de chantier. Voir le [README racine](../README.md) pour la vue d'ensemble du projet (backend, base de données, LLM).

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
│   └── (app)/
│       ├── page.tsx      # Tableau de bord (budget, lots, avancement)
│       ├── devis/        # Liste, détail ([id]), import
│       ├── factures/     # Liste, détail + comparaison ([id]/comparaison)
│       ├── entreprises/  # Gestion des entreprises
│       ├── import/       # Point d'entrée d'import unifié
│       └── parametres/   # Profil, dates chantier, IA + RAZ base (admin)
├── components/   # DevisModal, FactureModal, EntrepriseModal, ComparaisonTable,
│                 # ListTable, PdfUploadForm, PieceJointeUploadForm, EchangesLlm,
│                 # EntrepriseCombobox, Nav, TopBar, UserMenu, StatusBadge, ...
├── proxy.ts      # Redirige vers /login si le cookie de session est absent
└── lib/
    ├── api.ts       # Wrappers fetch typés (même origine, credentials: "include")
    ├── types.ts     # Miroirs TypeScript des DTOs C#
    ├── format.ts    # Formatage dates/montants
    ├── status.ts    # Libellés/couleurs des statuts
    └── useParallax.ts
```

## Auth

`proxy.ts` fait un contrôle optimiste sur la simple présence du cookie `suivi_chantier_auth` — il ne le valide pas. Le vrai gardien est le `[Authorize]` côté backend ; un cookie expiré passe le proxy et se fait rattraper par le 401 intercepté dans `lib/api.ts`, qui redirige vers `/login`.

## Notes

- Ce projet utilise Next.js 16, dont les APIs et conventions diffèrent des versions antérieures — voir `AGENTS.md` et `node_modules/next/dist/docs/` avant de modifier le routing ou les conventions de fichiers.
