# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Construction site monitoring app ("Le Point Travaux") for a personal home build, multi-utilisateur. Users import PDF quotes (devis) and invoices (factures), which are analyzed by an LLM via OpenRouter (vision or text mode) to extract structured data stored in PostgreSQL. The app compares invoices against quotes to flag discrepancies.

## Architecture

```
Suivi chantier/
├── backend/    # ASP.NET Core Web API (.NET 8, C#)
└── frontend/   # Next.js 16 (TypeScript, App Router, Tailwind 4, React 19)
```

**Database**: PostgreSQL — connection string via `SUIVI_CHANTIER_ConnectionStrings__Default` in `backend/.env`
**LLM**: OpenRouter (`https://openrouter.ai/api/v1`, OpenAI-compatible API). Vision-capable model required for scanned PDFs; PDFs with a native text layer are sent as text instead.
**Auth**: ASP.NET Core cookie session (`suivi_chantier_auth`); all data is scoped per `UserId`.

## Running the project

### Backend
```bash
cd backend
dotnet run
# API on http://localhost:5096, Swagger at http://localhost:5096/swagger (dev only)
```
Pending EF Core migrations are applied automatically at startup (`Database.Migrate()`).

### Frontend
```bash
cd frontend
npm run dev
# UI on http://localhost:3000
```

### Database migrations
```bash
cd backend
dotnet ef migrations add <MigrationName>
```
No need to run `dotnet ef database update` locally — the backend applies pending migrations on every startup.

Set the correct PostgreSQL connection string in `backend/.env` (`SUIVI_CHANTIER_ConnectionStrings__Default`) before running migrations.

## Backend structure

```
backend/
├── Controllers/
│   ├── AuthController.cs        # signup, login, logout, GET/PUT /api/auth/me
│   ├── DevisController.cs       # CRUD devis, import PDF, lignes, PDF, échanges LLM, recalcul
│   ├── FacturesController.cs    # CRUD factures, import, lignes, pièces jointes, comparaison, liaison devis
│   ├── EntreprisesController.cs # CRUD entreprises (rapprochement devis/facture)
│   └── SettingsController.cs    # modèle OpenRouter, liste des modèles, test de connexion, RAZ base (admin)
├── Models/                      # EF Core entities: User, Entreprise, Devis, LignePoste, Facture, LigneFacture, PieceJointe, LlmExchange
├── Services/
│   ├── PdfImageService.cs       # PDF → PNG (PDFtoImage + SkiaSharp) and native text extraction (PdfPig)
│   ├── OpenRouterService.cs     # HTTP calls to OpenRouter (vision or text mode)
│   ├── ExtractionService.cs     # Orchestrates PDF → images/text → LLM → DB (background task)
│   ├── ComparaisonService.cs    # Levenshtein-based line matching + ecart computation
│   ├── EntrepriseResolver.cs    # Reconciles/dedupes entreprises extracted from documents
│   ├── TextSanitizer.cs         # Masks IBAN/RIB/BIC in extracted text before it's sent to the LLM
│   ├── SettingsStore.cs         # OpenRouter settings, persisted back into backend/.env
│   ├── CurrentUserExtensions.cs # Reads UserId from auth claims
│   └── DotEnv.cs                # Loads backend/.env
├── DTOs/                        # DevisDto, FactureDto, ComparaisonDto, LlmExchangeDto
└── Data/AppDbContext.cs
```

Key NuGet packages: `Npgsql.EntityFrameworkCore.PostgreSQL`, `PDFtoImage`, `SkiaSharp`, `PdfPig`, `OpenAI`, `Swashbuckle.AspNetCore`.

All routes require authentication (`MapControllers().RequireAuthorization()`) except signup/login. OpenRouter settings and the DB reset endpoint are restricted to admin accounts.

## Frontend structure

```
frontend/src/
├── app/
│   ├── (auth)/           # login, signup (dedicated layout, outside the app shell)
│   ├── (app)/
│   │   ├── page.tsx          # Dashboard (budget, lots, progress)
│   │   ├── devis/            # List, detail ([id]), import
│   │   ├── factures/         # List, detail, comparaison ([id]/comparaison)
│   │   ├── entreprises/      # Entreprise management
│   │   ├── import/           # Unified import entry point
│   │   └── parametres/       # Profile, chantier dates, AI settings (admin), danger zone (admin)
│   └── maintenance/       # Static maintenance page, served via proxy.ts rewrite
├── components/           # Devis/facture/entreprise modals, tables, upload forms, nav, ...
├── proxy.ts              # Routing guard: MAINTENANCE_MODE rewrite + redirects to /login without a session cookie
└── lib/
    ├── api.ts            # Typed fetch wrappers (same-origin, credentials: include)
    ├── types.ts          # TypeScript mirrors of the C# DTOs
    ├── format.ts         # Formatting helpers (dates, amounts, ...)
    └── status.ts         # Status labels/colors (EnAttente / Extrait / Erreur)
```

## Configuration

All secrets live in `backend/.env` (gitignored, `SUIVI_CHANTIER_` prefix, `__` as section separator). `appsettings.json` only has a passwordless fallback connection string. Key variables:

| Variable | Role |
|---|---|
| `SUIVI_CHANTIER_ConnectionStrings__Default` | PostgreSQL connection string |
| `SUIVI_CHANTIER_OpenRouter__ApiKey` | OpenRouter API key |
| `SUIVI_CHANTIER_OpenRouter__Model` | OpenRouter model slug (vision-capable) |

- The OpenRouter model can also be changed from the **Paramètres** screen (admin only); the choice is written back into `backend/.env`. The API key is only ever set in the file.
- Frontend → backend: the frontend proxies `/api/*` to the backend via `next.config.ts` rewrites (same origin, required for the auth cookie to work). In production, `BACKEND_INTERNAL_URL` must be set **at build time**.
- `MAINTENANCE_MODE=true` (frontend env) rewrites every route except `/maintenance` to a static maintenance page (`proxy.ts`).

## Key behaviors

- **Storage**: PDFs and pièces jointes are stored **in the database** (`bytea` columns), not on disk. Served via `GET /api/devis/{id}/pdf`, `GET /api/factures/{id}/pdf`, and `/pieces-jointes/{pieceId}`.
- **Text vs. vision extraction**: if the PDF has a usable native text layer (> 50 chars), pages are sent as text to the LLM; otherwise it falls back to PNG images (vision mode).
- **PII masking**: `TextSanitizer` masks IBAN/RIB/BIC in extracted text before it reaches the LLM — OpenRouter's content filter otherwise rejects payment blocks that look like card numbers (HTTP 403 `CREDIT_CARD`).
- **Batching**: pages are sent in batches of 4 to avoid LLM context overflow; results are merged in C#. A batch with no total TTC does not overwrite an amount already found.
- **JSON robustness**: truncated responses are repaired (brace/bracket rebalancing) before parsing. Every call is logged to `LlmExchange` (prompts, raw response, duration, success/error); the merged JSON is kept in `ExtractionBrute` for audit.
- **Comparaison**: two modes — `Total` when the invoice has no detailed lines (ecart on TTC only), `Lignes` otherwise (Levenshtein distance matching, 40% threshold of the longer string; unmatched lines are flagged `NonMatche`). Comparison accounts for prior acomptes already invoiced against the same devis (`MontantDejaFacture`, `ResteAFacturer`).
- `NEXT_PUBLIC_API_URL` env var controls the backend URL from the frontend (default: `http://localhost:5000`; dev actually runs the backend on `5096` — set this explicitly when it differs).
