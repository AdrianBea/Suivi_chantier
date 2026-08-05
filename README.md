# Suivi Chantier

Application de suivi de chantier pour une construction personnelle. Import des devis et factures (PDF), extraction automatique des données via un LLM (OpenRouter), stockage en PostgreSQL, et comparaison devis/facture pour détecter les écarts.

## Architecture

```
Suivi chantier/
├── backend/    # ASP.NET Core Web API (.NET 8, C#)
└── frontend/   # Next.js 16 (TypeScript, App Router, Tailwind 4, React 19)
```

- **Base de données** : PostgreSQL — connexion via `SUIVI_CHANTIER_ConnectionStrings__Default` (`backend/.env`)
- **LLM** : OpenRouter (`https://openrouter.ai/api/v1`). Un PDF avec couche texte native est envoyé en texte ; un PDF scanné bascule en images, ce qui suppose un modèle vision.
- **Auth** : cookie de session ASP.NET Core (`suivi_chantier_auth`, 7 jours glissants), multi-utilisateurs, données cloisonnées par `UserId`.

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

### Tests

Aucun runner de test n'est configuré. `frontend/src/components/ListTable.test.tsx` est un script d'assertions autonome, lancé directement par Node :

```bash
cd frontend
node --experimental-strip-types src/components/ListTable.test.tsx
```

## Configuration

Tous les secrets vivent dans `backend/.env` (gitignoré). `backend/.env.example` documente les clés attendues :

| Variable | Rôle |
|---|---|
| `SUIVI_CHANTIER_ConnectionStrings__Default` | Chaîne de connexion PostgreSQL |
| `SUIVI_CHANTIER_OpenRouter__ApiKey` | Clé API OpenRouter |
| `SUIVI_CHANTIER_OpenRouter__Model` | Slug du modèle OpenRouter (vision si des PDF scannés sont attendus) |

- `appsettings.json` ne contient qu'un fallback de connexion sans mot de passe ; le `.env` prend le dessus (préfixe `SUIVI_CHANTIER_`, `__` = séparateur de section).
- Le modèle OpenRouter et la clé API sont **en lecture seule à l'exécution** : `SettingsStore` les charge depuis la configuration au démarrage et aucune route ne les réécrit. L'écran **Paramètres** (admin) affiche le modèle courant et permet de tester la connexion ; pour en changer, il faut éditer `backend/.env` (ou les variables Railway) et redémarrer.
- Front → back : le front proxifie `/api/*` vers le backend via les rewrites de `next.config.ts` (même origine, indispensable pour que le cookie d'auth circule). En prod, `BACKEND_INTERNAL_URL` doit être définie **au build** — sinon le build échoue volontairement plutôt que de graver `localhost:5096`.
- `MAINTENANCE_MODE=true` (env front) réécrit toutes les routes sauf `/maintenance` vers une page statique de maintenance.

## Backend

```
backend/
├── Controllers/
│   ├── AuthController.cs         # signup, login, logout, ping, GET/PUT /api/auth/me
│   ├── DevisController.cs        # CRUD devis, import PDF, lignes, PDF, échanges LLM, recalcul
│   ├── FacturesController.cs     # CRUD factures, import, lignes, pièces jointes, comparaison, liaison devis
│   ├── EntreprisesController.cs  # CRUD entreprises (rapprochement devis/facture)
│   ├── SettingsController.cs     # Modèle OpenRouter (lecture seule), test de connexion, purge de ses données (admin)
│   └── AdminController.cs        # Supervision multi-comptes : comptes, stats LLM, santé (admin)
├── Models/       # Entités EF Core : User, Entreprise, Devis, LignePoste, Facture, LigneFacture, PieceJointe, LlmExchange
├── Services/
│   ├── PdfImageService.cs        # PDF → PNG (PDFtoImage + SkiaSharp) et extraction texte (PdfPig)
│   ├── OpenRouterService.cs      # Appels HTTP au modèle OpenRouter (images ou texte)
│   ├── ExtractionService.cs      # Orchestration PDF → images/texte → LLM → BDD (en tâche de fond)
│   ├── ComparaisonService.cs     # Appariement des lignes (Levenshtein) + calcul des écarts
│   ├── EntrepriseResolver.cs     # Rapprochement/déduplication des entreprises extraites
│   ├── TextSanitizer.cs          # Masque IBAN/RIB/BIC avant envoi au LLM
│   ├── UploadLimits.cs           # Plafond 25 Mo partagé + contrôle de la vraie signature %PDF-
│   ├── UserPurge.cs              # Ordre de suppression imposé par les FK, en un seul endroit
│   ├── SettingsStore.cs          # Paramètres OpenRouter, lus depuis IConfiguration au démarrage
│   ├── CurrentUserExtensions.cs  # Récupération du UserId depuis les claims
│   └── DotEnv.cs                 # Chargement de backend/.env
├── DTOs/         # DevisDto, FactureDto, ComparaisonDto, LlmExchangeDto, AdminDto
└── Data/AppDbContext.cs
```

Packages clés : `Npgsql.EntityFrameworkCore.PostgreSQL`, `PDFtoImage`, `SkiaSharp`, `PdfPig`, `OpenAI`, `Swashbuckle.AspNetCore`.

### Sécurité

Toutes les routes exigent une authentification (`MapControllers().RequireAuthorization()`), sauf signup/login/ping. Les surfaces admin passent par la policy `AdminOnly` (claim `IsAdmin`) : tout `AdminController`, `SettingsController`, et les endpoints de debug `{id}/echanges` des devis et factures.

- **Rate limiting** : fenêtre fixe, 10 requêtes / 5 min par IP, uniquement sur `signup`, `login` et `ping`.
- **Forwarded headers** : `UseForwardedHeaders()` s'exécute en premier pour que le rate limiter voie l'IP réelle du client derrière le proxy Railway, et non celle du proxy.
- **CORS** enregistré en développement seulement — en prod le proxy du front rend tous les appels same-origin, et une politique `AllowCredentials` ouvrirait le backend public à une origine hostile.
- **HSTS** en production, pas de `UseHttpsRedirection` (Railway termine le TLS ; le trafic proxy→backend est en HTTP).
- **Login** : un hash PBKDF2 bidon est vérifié quand l'email est inconnu, pour que le temps de réponse ne permette pas d'énumérer les comptes.
- **Promotion admin** manuelle en base uniquement. Aucune route n'accorde le flag ; `PATCH /api/admin/users/{id}/admin` refuse l'auto-modification et refuse de rétrograder le dernier admin.
- **Uploads** : 25 Mo, à maintenir alignés sur **trois** couches — `UploadLimits.MaxBytes`, `MaxRequestBodySize` (Kestrel) et `experimental.proxyClientMaxBodySize` (`next.config.ts`). Une limite trop basse côté proxy Next **tronque le corps sans erreur**. Les PDF sont validés sur leur vraie signature `%PDF-`, pas sur le nom de fichier ni le ContentType fournis par le client.

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
│       ├── import/       # Import unifié (file d'attente multi-fichiers + polling)
│       ├── admin/        # comptes, llm, sante (onglets admin)
│       ├── aide/         # Page d'aide / FAQ statique
│       └── parametres/   # Profil, dates chantier, IA (admin), zone dangereuse (admin)
├── components/   # Modals devis/factures/entreprises, tables, upload, nav, ...
├── proxy.ts      # Garde de routing : rewrite MAINTENANCE_MODE + redirection vers /login sans cookie
└── lib/
    ├── api.ts       # Wrappers fetch typés (même origine, credentials: include)
    ├── types.ts     # Miroirs TypeScript des DTOs C# + TYPE_LOT_LABELS/COLORS
    ├── format.ts    # Formatage (dates, montants, ...)
    ├── status.ts    # Libellés/couleurs des statuts (EnAttente / Extrait / Erreur)
    ├── useIsAdmin.ts    # Masque l'UI admin (confort d'affichage — le backend renvoie 403 de toute façon)
    ├── useMediaQuery.ts # Hook de breakpoint responsive
    └── useParallax.ts   # Hook d'effet parallax (dashboard)
```

## Flux métiers

### 1. Import → extraction (asynchrone)

`POST /api/devis/import` (ou `/api/factures/import`, éventuellement `?devisId=`) valide le PDF, enregistre la ligne avec `Statut = EnAttente`, puis répond **immédiatement** ; l'extraction tourne dans un `Task.Run` détaché avec son propre scope DI. La file d'import du front interroge le document jusqu'à ce qu'il quitte `EnAttente`.

Le champ `mode` (`Texte` | `Image`) choisit la stratégie — le front envoie toujours `Texte`, et le backend bascule seul en `Image` si la couche texte est trop maigre (< 50 caractères non blancs sur l'ensemble des pages).

Pipeline : pages → lots de 4 → un appel LLM par lot → fusion en C# → résolution de l'entreprise → écriture des lignes et totaux → `Statut = Extrait` (ou `Erreur` si rien d'exploitable). Chaque appel est tracé dans `LlmExchange` ; le JSON fusionné va dans `ExtractionBrute`, les réponses brutes concaténées dans `ReponseBrute`.

Les montants (`total_ht`, `tva_montant`, `total_ttc`) viennent du LLM tels quels — **aucun recalcul à l'import**. `POST /{id}/recalculer` est une action explicite de l'utilisateur qui réécrit les totaux depuis la somme des lignes (TVA à 20 % par défaut).

### 2. Résolution des entreprises

`EntrepriseResolver.ResolveAsync` matche d'abord sur le SIRET, puis sur le nom (insensible à la casse), toujours dans le périmètre de l'utilisateur. Il ne **crée** une entreprise que si le nom **et** le SIRET sont présents ; un nom seul rattache à une fiche existante ou renvoie null, laissant le document à rattacher à la main.

### 3. Numérotation des documents

`(UserId, EntrepriseId, NumeroDevis)` et `(UserId, EntrepriseId, NumeroFacture)` sont des index uniques partiels (filtrés sur `IS NOT NULL`). Un numéro vide est normalisé en `null` avant toute comparaison — une chaîne vide n'est pas null côté SQL et serait indexée. En création/édition manuelle, un doublon renvoie **409 Conflict** ; à l'extraction, un numéro déjà pris est silencieusement ramené à `null` plutôt que de perdre toute l'extraction.

### 4. Rapprochement devis ↔ facture

Une facture est liée à un devis à l'import (`?devisId=`) ou après coup via `PATCH /api/factures/{id}/lier/{devisId}` — qui exige que les deux documents appartiennent à la même entreprise. Tant qu'une facture est liée, son entreprise ne peut plus être changée (il faut délier d'abord).

`GET /api/factures/{id}/comparaison` renvoie deux modes :
- **`Total`** — la facture n'a pas de lignes détaillées : seul l'écart TTC est calculé.
- **`Lignes`** — appariement par distance de Levenshtein, accepté sous un seuil de 40 % de la chaîne la plus longue. Les lignes non appariées sont marquées `NonMatche`. Les appariements sont persistés dans `LigneFacture.LignePosteId` ; les écarts eux-mêmes sont calculés à la volée et jamais stockés.

Les deux modes remontent `MontantDejaFacture` (somme des autres factures du même devis, soit les acomptes déjà émis) et `ResteAFacturer`. `HasDiscrepancies` se déclenche sur un écart TTC supérieur à 0,01 € ou sur toute ligne non appariée.

### 5. Agrégation du tableau de bord

Le tableau de bord agrège côté client à partir des listes devis et factures (paginées, 20 par page par défaut) : budget prévu = Σ TTC des devis, engagé = Σ TTC des factures. Le budget par lot regroupe sur l'énum `TypeLot` normalisé (et non sur le champ libre `Lot`), une facture retombant sur le `TypeLot` de son devis lié si elle n'en a pas.

### 6. Supervision admin

`/admin` (redirige vers `/admin/comptes`) est le seul endroit qui lit les données de plusieurs utilisateurs. Endpoints : `GET /api/admin/users` (nombre de documents et octets stockés par compte), `PATCH|DELETE users/{id}`, `GET llm/stats` (taux de succès, durée moyenne et p95, répartition par modèle, série sur 7 jours découpée en heure **Europe/Paris**), `GET llm/exchanges[/{id}]` et `GET health` (accessibilité base, version, uptime, taille de la base, octets stockés, documents en erreur).

Les deux chemins de suppression passent par `UserPurge.PurgeDataAsync`, qui détient l'ordre imposé par les FK : `POST /api/settings/reset` ne purge **que les données du compte appelant**, tandis que `DELETE /api/admin/users/{id}` purge puis supprime le compte, dans une transaction explicite.

## Comportements clés

- **Stockage** : les PDF et pièces jointes sont stockés **en base** (colonnes `bytea`), pas sur le disque. Servis via `GET /api/devis/{id}/pdf`, `GET /api/factures/{id}/pdf` et `/pieces-jointes/{pieceId}`, toujours en `Content-Disposition: inline` pour la prévisualisation. Les pièces jointes n'acceptent que PDF/JPG/PNG, contrôlés sur l'extension **et** le ContentType.
- **Extraction texte vs image** : si le PDF a une couche texte exploitable (> 50 caractères), les pages sont envoyées en texte ; sinon fallback en images PNG (mode vision).
- **Masquage des données bancaires** : `TextSanitizer` masque IBAN/RIB/BIC avant l'envoi au LLM — le filtre de contenu d'OpenRouter rejette sinon les pavés de règlement qui ressemblent à un numéro de carte (HTTP 403 `CREDIT_CARD`). Les motifs exigent soit aucun espacement, soit un découpage régulier par blocs de 4, pour ne pas mordre sur le texte libre des lignes ni sur les SIRET à 14 chiffres.
- **Batching** : les pages sont envoyées par lots de 4 ; les résultats sont fusionnés côté C#. Un lot sans total TTC n'écrase pas un montant déjà trouvé.
- **Robustesse JSON** : parsing via `JsonDocument` (tolérant aux clés dupliquées, contrairement à `JsonNode`), retrait des blocs markdown, et réparation des réponses tronquées (rééquilibrage des accolades/crochets). Les confusions de type du LLM (nombre en texte, virgule française, `%`) sont absorbées par les helpers `Parse*`.
- **Suppressions** : les FK `User → Entreprise/Devis/Facture` sont en `Restrict` (rien ne casse en cascade depuis un utilisateur), `Devis → LignePoste` et `Facture → LigneFacture/PieceJointe` en `Cascade`, `Facture.DevisId` et `LigneFacture.LignePosteId` en `SetNull`.
