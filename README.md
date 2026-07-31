# Suivi Chantier

Application de suivi de chantier pour une construction personnelle. Import des devis et factures (PDF), extraction automatique des données via un LLM vision (OpenRouter), stockage en PostgreSQL, et comparaison devis/facture pour détecter les écarts.

## Architecture

```
Suivi chantier/
├── backend/    # ASP.NET Core Web API (.NET 8, C#)
└── frontend/   # Next.js (TypeScript, App Router, Tailwind)
```

- **Base de données** : PostgreSQL — connexion configurée dans `backend/appsettings.json`
- **LLM** : OpenRouter (`https://openrouter.ai/api/v1`), modèle vision requis (Qwen2-VL, Llama-3.2-Vision, GPT-4o, ...)

## Démarrage rapide

### Backend

```bash
cd backend
dotnet run
```

API sur `http://localhost:5000`, Swagger sur `http://localhost:5000/swagger`.

### Frontend

```bash
cd frontend
npm run dev
```

UI sur `http://localhost:3000`. Voir [frontend/README.md](frontend/README.md) pour le détail.

### Migrations base de données

```bash
cd backend
dotnet ef migrations add <NomMigration>
dotnet ef database update
```

Renseigner le mot de passe PostgreSQL dans `backend/appsettings.json` (`ConnectionStrings.Default`) avant toute migration.

## Configuration

- La clé API OpenRouter vit uniquement dans `backend/.env` (`SUIVI_CHANTIER_OpenRouter__ApiKey`) et n'est jamais committée ni renvoyée en clair par l'API.
- Le modèle OpenRouter (`OpenRouter.Model`) est modifiable depuis `appsettings.json` ou l'écran Paramètres du front.
- `NEXT_PUBLIC_API_URL` (frontend) pointe vers le backend, `http://localhost:5000` par défaut.

## Backend

```
backend/
├── Controllers/
│   ├── DevisController.cs        # POST /api/devis/import, GET /api/devis, GET /api/devis/{id}
│   ├── FacturesController.cs     # POST /api/factures/import, GET /api/factures, GET /api/factures/{id}/comparaison
│   ├── EntreprisesController.cs  # CRUD entreprises (rapprochement devis/facture)
│   └── SettingsController.cs     # Lecture/mise à jour du modèle OpenRouter, liste des modèles disponibles
├── Models/       # Entités EF Core : Entreprise, Devis, LignePoste, Facture, LigneFacture, PieceJointe, LlmExchange
├── Services/
│   ├── PdfImageService.cs        # PDF → PNG (PDFtoImage + SkiaSharp)
│   ├── OpenRouterService.cs      # Appels HTTP au modèle vision OpenRouter
│   ├── ExtractionService.cs      # Orchestration PDF → images → LLM → BDD
│   ├── ComparaisonService.cs     # Appariement des lignes (distance de Levenshtein) + calcul des écarts
│   ├── EntrepriseResolver.cs     # Rapprochement/déduplication des entreprises extraites
│   ├── SettingsStore.cs          # Paramètres OpenRouter persistés
│   └── DotEnv.cs                 # Chargement de backend/.env
├── DTOs/         # DevisDto, FactureDto, ComparaisonDto, LlmExchangeDto
└── Data/AppDbContext.cs
```

Packages clés : `Npgsql.EntityFrameworkCore.PostgreSQL`, `PDFtoImage`, `SkiaSharp`, `PdfPig`, `OpenAI` (client compatible OpenRouter).

## Frontend

```
frontend/src/
├── app/(app)/
│   ├── devis/        # Liste, détail, import
│   ├── factures/     # Liste, détail, import, comparaison
│   ├── entreprises/  # Gestion des entreprises
│   ├── import/        # Point d'entrée d'import unifié
│   └── parametres/    # Modèle OpenRouter, clé API (lecture seule)
└── lib/
    ├── api.ts       # Wrappers fetch typés pour tous les endpoints
    ├── types.ts     # Miroirs TypeScript des DTOs C#
    ├── csv.ts       # Export CSV
    ├── format.ts    # Formatage (dates, montants, ...)
    └── status.ts    # Libellés/couleurs des statuts (EnAttente / Extrait / Erreur)
```

## Comportements clés

- Les PDF sont stockés sous `backend/uploads/devis/` et `backend/uploads/factures/`.
- Chaque page PDF est convertie en PNG et envoyée au LLM par lots de 4 pages (évite le dépassement de contexte) ; les résultats sont fusionnés côté C#.
- Les réponses du LLM sont nettoyées des balises markdown avant parsing JSON ; la réponse brute est conservée (`ExtractionBrute` / `LlmExchange`) pour audit.
- Le rapprochement facture/devis utilise la distance de Levenshtein avec un seuil de 40% ; les lignes non appariées sont marquées `NonMatche`.
