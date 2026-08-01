# Suivi Chantier

Application de suivi de chantier pour une construction personnelle. Import des devis et factures (PDF), extraction automatique des données via un LLM (OpenRouter), stockage en PostgreSQL, et comparaison devis/facture pour détecter les écarts.

## Architecture

```
Suivi chantier/
├── backend/    # ASP.NET Core Web API (.NET 8, C#)
└── frontend/   # Next.js 16 (TypeScript, App Router, Tailwind 4, React 19)
```

- **Base de données** : PostgreSQL — connexion via `SUIVI_CHANTIER_ConnectionStrings__Default` (`backend/.env`)
- **LLM** : OpenRouter (`https://openrouter.ai/api/v1`). Modèle vision requis pour les PDF scannés ; un PDF avec couche texte native est envoyé en texte.
- **Auth** : cookie de session ASP.NET Core (`suivi_chantier_auth`), multi-utilisateurs, données cloisonnées par `UserId`.

## Démarrage rapide

### Backend

```bash
cd backend
dotnet run
```

API sur `http://localhost:5096`, Swagger sur `http://localhost:5096/swagger` (dev uniquement).
Les migrations EF Core sont appliquées automatiquement au démarrage (`Database.Migrate()`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI sur `http://localhost:3000`. Voir [frontend/README.md](frontend/README.md) pour le détail.

### Migrations base de données

```bash
cd backend
dotnet ef migrations add <NomMigration>
```

Pas besoin de `dotnet ef database update` en local : le backend applique les migrations en attente à chaque démarrage.

## Configuration

Tous les secrets vivent dans `backend/.env` (gitignoré). Un fichier d'exemple documente les clés attendues :

| Variable | Rôle |
|---|---|
| `SUIVI_CHANTIER_ConnectionStrings__Default` | Chaîne de connexion PostgreSQL |
| `SUIVI_CHANTIER_OpenRouter__ApiKey` | Clé API OpenRouter |
| `SUIVI_CHANTIER_OpenRouter__Model` | Slug du modèle OpenRouter |

- `appsettings.json` ne contient qu'un fallback de connexion sans mot de passe ; le `.env` prend le dessus (préfixe `SUIVI_CHANTIER_`, `__` = séparateur de section).
- Le modèle OpenRouter est modifiable depuis l'écran **Paramètres** (admin uniquement) ; le choix est réécrit dans `backend/.env` pour survivre au redémarrage. La clé API, elle, se configure uniquement dans le fichier.
- Front → back : le front proxifie `/api/*` vers le backend via les rewrites de `next.config.ts` (même origine, indispensable pour que le cookie d'auth circule). En prod, `BACKEND_INTERNAL_URL` doit être définie **au build**.

## Backend

```
backend/
├── Controllers/
│   ├── AuthController.cs         # signup, login, logout, GET/PUT /api/auth/me
│   ├── DevisController.cs        # CRUD devis, import PDF, lignes, PDF, échanges LLM, recalcul
│   ├── FacturesController.cs     # CRUD factures, import, lignes, pièces jointes, comparaison, liaison devis
│   ├── EntreprisesController.cs  # CRUD entreprises (rapprochement devis/facture)
│   └── SettingsController.cs     # Modèle OpenRouter, liste des modèles, test de connexion, RAZ base
├── Models/       # Entités EF Core : User, Entreprise, Devis, LignePoste, Facture, LigneFacture, PieceJointe, LlmExchange
├── Services/
│   ├── PdfImageService.cs        # PDF → PNG (PDFtoImage + SkiaSharp) et extraction texte (PdfPig)
│   ├── OpenRouterService.cs      # Appels HTTP au modèle OpenRouter (images ou texte)
│   ├── ExtractionService.cs      # Orchestration PDF → images/texte → LLM → BDD (en tâche de fond)
│   ├── ComparaisonService.cs     # Appariement des lignes (Levenshtein) + calcul des écarts
│   ├── EntrepriseResolver.cs     # Rapprochement/déduplication des entreprises extraites
│   ├── SettingsStore.cs          # Paramètres OpenRouter, persistés dans backend/.env
│   ├── CurrentUserExtensions.cs  # Récupération du UserId depuis les claims
│   └── DotEnv.cs                 # Chargement de backend/.env
├── DTOs/         # DevisDto, FactureDto, ComparaisonDto, LlmExchangeDto
└── Data/AppDbContext.cs
```

Packages clés : `Npgsql.EntityFrameworkCore.PostgreSQL`, `PDFtoImage`, `SkiaSharp`, `PdfPig`, `OpenAI`, `Swashbuckle.AspNetCore`.

Toutes les routes exigent une authentification (`MapControllers().RequireAuthorization()`), sauf signup/login. Les réglages OpenRouter et la RAZ de la base sont réservés aux comptes admin.

## Frontend

```
frontend/src/
├── app/
│   ├── (auth)/       # login, signup (layout dédié, hors app)
│   └── (app)/
│       ├── page.tsx      # Tableau de bord (budget, lots, avancement)
│       ├── devis/        # Liste, détail ([id]), import
│       ├── factures/     # Liste, détail, comparaison ([id]/comparaison)
│       ├── entreprises/  # Gestion des entreprises
│       ├── import/       # Point d'entrée d'import unifié
│       └── parametres/   # Profil, dates chantier, IA (admin), zone dangereuse (admin)
├── components/   # Modals devis/factures/entreprises, tables, upload, nav, ...
├── proxy.ts      # Garde de routing : redirige vers /login sans cookie de session
└── lib/
    ├── api.ts       # Wrappers fetch typés (même origine, credentials: include)
    ├── types.ts     # Miroirs TypeScript des DTOs C#
    ├── csv.ts       # Export CSV
    ├── format.ts    # Formatage (dates, montants, ...)
    └── status.ts    # Libellés/couleurs des statuts (EnAttente / Extrait / Erreur)
```

## Comportements clés

- **Stockage** : les PDF et pièces jointes sont stockés **en base** (colonnes `bytea`), pas sur le disque. Ils sont servis via `GET /api/devis/{id}/pdf`, `GET /api/factures/{id}/pdf` et `/pieces-jointes/{pieceId}`.
- **Extraction texte vs image** : si le PDF a une couche texte exploitable (> 50 caractères), les pages sont envoyées en texte au LLM ; sinon fallback en images PNG (mode vision).
- **Batching** : les pages sont envoyées par lots de 4 (évite le dépassement de contexte) ; les résultats sont fusionnés côté C#. Un lot sans total TTC n'écrase pas un montant déjà trouvé.
- **Robustesse JSON** : les réponses tronquées sont réparées (rééquilibrage des accolades/crochets) avant parsing. Chaque appel est tracé dans `LlmExchange` (prompts, réponse brute, durée, succès/erreur) ; le JSON fusionné est conservé dans `ExtractionBrute`.
- **Comparaison** : deux modes. `Total` si la facture n'a pas de lignes détaillées (écart sur le TTC seul) ; `Lignes` sinon — appariement par distance de Levenshtein avec un seuil de 40 % de la chaîne la plus longue, les lignes non appariées sont marquées `NonMatche`. La comparaison tient compte des acomptes déjà émis sur le même devis (`MontantDejaFacture`, `ResteAFacturer`).
