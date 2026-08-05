# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Construction site monitoring app ("Le Point Travaux") for a personal home build, multi-utilisateur. Users import PDF quotes (devis) and invoices (factures), which are analyzed by an LLM via OpenRouter (text or vision mode) to extract structured data stored in PostgreSQL. The app compares invoices against quotes to flag discrepancies.

## Architecture

```
Suivi chantier/
├── backend/    # ASP.NET Core Web API (.NET 8, C#)
└── frontend/   # Next.js 16 (TypeScript, App Router, Tailwind 4, React 19)
```

**Database**: PostgreSQL — connection string via `SUIVI_CHANTIER_ConnectionStrings__Default` in `backend/.env`
**LLM**: OpenRouter (`https://openrouter.ai/api/v1`, OpenAI-compatible API). PDFs with a native text layer are sent as text; scanned PDFs fall back to PNG images, which requires a vision-capable model.
**Auth**: ASP.NET Core cookie session (`suivi_chantier_auth`, 7 days, sliding); all data is scoped per `UserId`.

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

### Tests
There is no test runner configured. `frontend/src/components/ListTable.test.tsx` is a standalone assertion script run directly by Node:
```bash
cd frontend
node --experimental-strip-types src/components/ListTable.test.tsx
```

## Backend structure

```
backend/
├── Controllers/
│   ├── AuthController.cs        # signup, login, logout, ping, GET/PUT /api/auth/me
│   ├── DevisController.cs       # CRUD devis, import PDF, lignes, PDF, échanges LLM, recalcul
│   ├── FacturesController.cs    # CRUD factures, import, lignes, pièces jointes, comparaison, liaison devis
│   ├── EntreprisesController.cs # CRUD entreprises (rapprochement devis/facture)
│   ├── SettingsController.cs    # OpenRouter model (read-only), connection test, purge of own data (admin)
│   └── AdminController.cs       # multi-account supervision: comptes, stats LLM, santé (admin)
├── Models/                      # EF Core entities: User, Entreprise, Devis, LignePoste, Facture, LigneFacture, PieceJointe, LlmExchange
├── Services/
│   ├── PdfImageService.cs       # PDF → PNG (PDFtoImage + SkiaSharp) and native text extraction (PdfPig)
│   ├── OpenRouterService.cs     # HTTP calls to OpenRouter (vision or text mode)
│   ├── ExtractionService.cs     # Orchestrates PDF → images/text → LLM → DB (background task)
│   ├── ComparaisonService.cs    # Levenshtein-based line matching + ecart computation
│   ├── EntrepriseResolver.cs    # Reconciles/dedupes entreprises extracted from documents
│   ├── TextSanitizer.cs         # Masks IBAN/RIB/BIC in extracted text before it's sent to the LLM
│   ├── UploadLimits.cs          # Shared 25 MB cap + real %PDF- signature check
│   ├── UserPurge.cs             # Single source of truth for FK-ordered deletion of a user's data
│   ├── SettingsStore.cs         # OpenRouter settings, read-only from IConfiguration at startup
│   ├── CurrentUserExtensions.cs # Reads UserId from auth claims
│   └── DotEnv.cs                # Loads backend/.env
├── DTOs/                        # DevisDto, FactureDto, ComparaisonDto, LlmExchangeDto, AdminDto
└── Data/AppDbContext.cs
```

Key NuGet packages: `Npgsql.EntityFrameworkCore.PostgreSQL`, `PDFtoImage`, `SkiaSharp`, `PdfPig`, `OpenAI`, `Swashbuckle.AspNetCore`.

### Security posture (Program.cs)

All routes require authentication (`MapControllers().RequireAuthorization()`) except signup/login/ping. Admin-only surfaces use the `AdminOnly` policy (claim `IsAdmin`): the whole `AdminController`, `SettingsController`, and the `{id}/echanges` debug endpoints on devis/factures.

- **Rate limiting**: fixed window, 10 requests / 5 min per IP, applied only to `signup`, `login` and `ping` (`EnableRateLimiting("auth")`).
- **Forwarded headers**: `UseForwardedHeaders()` runs first so the rate limiter sees the real client IP behind the Railway proxy, not the proxy's. `KnownNetworks`/`KnownProxies` are deliberately cleared.
- **CORS** is registered in Development only — in production the frontend proxy makes every call same-origin, and an `AllowCredentials` policy would open the public backend to a hostile origin.
- **HSTS** in production, no `UseHttpsRedirection` (Railway terminates TLS; proxy→backend traffic is plain HTTP).
- **Login hardening**: a dummy PBKDF2 verify runs when the email is unknown, so response time can't be used to enumerate accounts.
- **Admin promotion** is manual only (`UPDATE "Users" SET "IsAdmin" = true`). No route grants the flag; `PATCH /api/admin/users/{id}/admin` refuses self-modification and refuses to demote the last remaining admin.
- **Uploads**: 25 MB, enforced in three places that must stay in sync — `UploadLimits.MaxBytes`, Kestrel's `MaxRequestBodySize`, and `experimental.proxyClientMaxBodySize` in `next.config.ts`. Under-sizing the Next proxy limit **truncates the body silently** instead of rejecting it. PDFs are validated on their real `%PDF-` signature, not on client-supplied filename/ContentType.
- Retry-on-failure is enabled on Npgsql (6 attempts) because Railway suspends the database after inactivity.

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
│   │   ├── import/           # Unified import entry point (multi-file queue + polling)
│   │   ├── admin/            # comptes, llm, sante (admin tabs)
│   │   ├── aide/             # Static help/FAQ page (server component)
│   │   └── parametres/       # Profile, chantier dates, AI settings (admin), danger zone (admin)
│   └── maintenance/       # Static maintenance page, served via proxy.ts rewrite
├── components/           # Devis/facture/entreprise modals, tables, upload forms, nav, ...
├── proxy.ts              # Routing guard: MAINTENANCE_MODE rewrite + redirects to /login without a session cookie
└── lib/
    ├── api.ts            # Typed fetch wrappers (same-origin, credentials: include)
    ├── types.ts          # TypeScript mirrors of the C# DTOs + TYPE_LOT_LABELS/COLORS
    ├── format.ts         # Formatting helpers (dates, amounts, ...)
    ├── status.ts         # Status labels/colors (EnAttente / Extrait / Erreur)
    ├── useIsAdmin.ts     # Hides admin-only UI (display comfort only — backend still returns 403)
    ├── useMediaQuery.ts  # Responsive breakpoint hook
    └── useParallax.ts    # Parallax effect (dashboard hero)
```

`lib/api.ts` centralizes error handling: it converts plain-text bodies, ASP.NET `ProblemDetails` and empty bodies into a single human-readable message, and on a 401 it force-logs-out then redirects to `/login` (a stale-but-present cookie would otherwise ping-pong against `proxy.ts`).

## Configuration

All secrets live in `backend/.env` (gitignored, `SUIVI_CHANTIER_` prefix, `__` as section separator). `appsettings.json` only has a passwordless fallback connection string. Key variables:

| Variable | Role |
|---|---|
| `SUIVI_CHANTIER_ConnectionStrings__Default` | PostgreSQL connection string |
| `SUIVI_CHANTIER_OpenRouter__ApiKey` | OpenRouter API key |
| `SUIVI_CHANTIER_OpenRouter__Model` | OpenRouter model slug (vision-capable if scanned PDFs are expected) |

- The OpenRouter model and API key are **read-only at runtime**: `SettingsStore` loads them from `IConfiguration` at startup and no endpoint writes them back. The **Paramètres** screen (admin only) displays the current model and can test the connection — changing either means editing `backend/.env` (or the Railway variables) and restarting.
- Frontend → backend: the frontend proxies `/api/*` to the backend via `next.config.ts` rewrites (same origin, required for the auth cookie to work). In production, `BACKEND_INTERNAL_URL` must be set **at build time** — the build fails deliberately rather than baking in `localhost:5096`.
- `MAINTENANCE_MODE=true` (frontend env) rewrites every route except `/maintenance` to a static maintenance page (`proxy.ts`).

## Business flows

### 1. Import → extraction (asynchronous)

`POST /api/devis/import` (or `/api/factures/import`, optionally `?devisId=`) validates the PDF, persists the row with `Statut = EnAttente`, then returns **immediately**; extraction runs in a fire-and-forget `Task.Run` with its own DI scope (`ExtractionService`). The frontend import queue polls the document until its status leaves `EnAttente`.

The `mode` form field (`Texte` | `Image`) selects the strategy — the frontend always sends `Texte`, and the backend downgrades to `Image` on its own when the text layer is too thin (< 50 non-whitespace chars across all pages).

Pipeline per document: pages → batches of 4 → one LLM call per batch → merge in C# → resolve entreprise → persist lines + totals → `Statut = Extrait` (or `Erreur` if nothing usable came back). Every call is written to `LlmExchange`; the merged JSON lands in `ExtractionBrute` and the concatenated raw responses in `ReponseBrute`.

Amounts (`total_ht`, `tva_montant`, `total_ttc`) come from the LLM verbatim — **no recomputation at import**. `POST /{id}/recalculer` is an explicit user action that overwrites totals from the sum of lines (`TvaTaux` defaulting to 20%).

### 2. Entreprise resolution

`EntrepriseResolver.ResolveAsync` matches on SIRET first, then on name (case-insensitive), always scoped to the user. It **only creates** a new entreprise when both name and SIRET are present; a bare name either attaches to an existing record or returns null, leaving the document unattached for the user to fix by hand.

### 3. Document numbering

`(UserId, EntrepriseId, NumeroDevis)` and `(UserId, EntrepriseId, NumeroFacture)` are unique partial indexes (filtered on `IS NOT NULL`). Blank numbers are normalized to `null` before any comparison — an empty string is not null in SQL and would otherwise be indexed. On manual create/update a duplicate returns **409 Conflict**; during extraction, an already-taken number is silently dropped to `null` rather than losing the whole extraction, and the error path also clears the number so a retry can't replay the same violation.

### 4. Devis ↔ facture reconciliation

A facture is linked to a devis at import (`?devisId=`) or afterwards via `PATCH /api/factures/{id}/lier/{devisId}` — which requires both documents to belong to the same entreprise. While a facture is linked, its entreprise cannot be changed (unlink first).

`GET /api/factures/{id}/comparaison` returns one of two modes:
- **`Total`** — the facture has no detailed lines: only the TTC gap is reported.
- **`Lignes`** — Levenshtein matching between facture and devis lines, accepted when the distance is under 40% of the longer string. Unmatched lines are flagged `NonMatche`. Matches are persisted onto `LigneFacture.LignePosteId`; the ecarts themselves are computed on the fly and never stored.

Both modes report `MontantDejaFacture` (sum of the other factures on the same devis, i.e. acomptes already issued) and `ResteAFacturer`. `HasDiscrepancies` trips on a TTC gap above 0.01 € or on any unmatched line.

### 5. Dashboard aggregation

The dashboard aggregates client-side from the (paginated, default 20/page) devis and factures lists: budget prévu = Σ devis TTC, engagé = Σ factures TTC. Budget-per-lot groups on the normalized `TypeLot` enum (not the free-text `Lot` field), a facture falling back to its linked devis' `TypeLot` when it has none.

### 6. Admin supervision

`/admin` (redirects to `/admin/comptes`) is the only place reading across users. Backing endpoints: `GET /api/admin/users` (per-account document counts and stored bytes), `PATCH|DELETE users/{id}`, `GET llm/stats` (success rate, mean/p95 latency, per-model breakdown, 7-day series bucketed in **Europe/Paris**), `GET llm/exchanges[/{id}]`, and `GET health` (DB reachability, version, uptime, DB size, stored bytes, documents in error).

Deletion paths both go through `UserPurge.PurgeDataAsync`, which owns the FK order (LlmExchanges by document join → Factures → Devis → Entreprises): `POST /api/settings/reset` purges **only the caller's own data**, while `DELETE /api/admin/users/{id}` purges then removes the account, in an explicit transaction.

## Key behaviors

- **Storage**: PDFs and pièces jointes are stored **in the database** (`bytea` columns), not on disk. Served via `GET /api/devis/{id}/pdf`, `GET /api/factures/{id}/pdf`, and `/pieces-jointes/{pieceId}`, always `Content-Disposition: inline` for in-app preview. Pièces jointes accept PDF/JPG/PNG only, checked on extension **and** ContentType.
- **Text vs. vision extraction**: if the PDF has a usable native text layer (> 50 chars), pages are sent as text to the LLM; otherwise it falls back to PNG images (vision mode).
- **PII masking**: `TextSanitizer` masks IBAN/RIB/BIC in extracted text before it reaches the LLM — OpenRouter's content filter otherwise rejects payment blocks that look like card numbers (HTTP 403 `CREDIT_CARD`). The patterns deliberately require either no spacing or regular 4-char grouping, so free-text line descriptions and 14-digit SIRETs survive intact.
- **Batching**: pages are sent in batches of 4 to avoid LLM context overflow; results are merged in C#. A batch with no total TTC does not overwrite an amount already found.
- **JSON robustness**: responses are parsed through `JsonDocument` (tolerant of duplicate keys, unlike `JsonNode`), stripped of markdown fences, and truncated responses are repaired (brace/bracket rebalancing) before parsing. Number/string type confusion from the LLM is absorbed by the `Parse*` helpers (French decimal commas, `%`, thin spaces).
- **Deletes**: `User → Entreprise/Devis/Facture` FKs are `Restrict` (nothing cascades from a user), `Devis → LignePoste` and `Facture → LigneFacture/PieceJointe` are `Cascade`, `Facture.DevisId` and `LigneFacture.LignePosteId` are `SetNull`.
- `NEXT_PUBLIC_API_URL` is not used by `lib/api.ts` — all calls are same-origin (`API_BASE = ""`) and routed by the Next rewrite. `BACKEND_INTERNAL_URL` is the variable that actually matters.
