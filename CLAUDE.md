# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Construction site monitoring app for a personal home build. Users import PDF quotes (devis) and invoices (factures), which are converted to images and analyzed by a local LLM (LM Studio) to extract structured data stored in MySQL. The app compares invoices against quotes to flag discrepancies.

## Architecture

```
Suivi chantier/
├── backend/    # ASP.NET Core Web API (.NET 8, C#)
└── frontend/   # Next.js (TypeScript, App Router, Tailwind)
```

**Database**: MySQL — connection string in `backend/appsettings.json`  
**LLM**: LM Studio on `http://localhost:1234/v1` (OpenAI-compatible API, vision model required)

## Running the project

### Backend
```bash
cd backend
dotnet run
# API on http://localhost:5000, Swagger at http://localhost:5000/swagger
```

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
dotnet ef database update
```

Before running migrations, set the correct MySQL password in `appsettings.json` (`ConnectionStrings.Default`).

## Backend structure

```
backend/
├── Controllers/
│   ├── DevisController.cs       # POST /api/devis/import, GET /api/devis, GET /api/devis/{id}
│   └── FacturesController.cs    # POST /api/factures/import, GET /api/factures, GET /api/factures/{id}/comparaison
├── Models/                      # EF Core entities: Entreprise, Devis, LignePoste, Facture, LigneFacture
├── Services/
│   ├── PdfImageService.cs       # PDF → PNG using PDFtoImage + SkiaSharp
│   ├── LmStudioService.cs       # HTTP calls to LM Studio vision model
│   ├── ExtractionService.cs     # Orchestrates PDF→images→LLM→DB; handles devis and factures
│   └── ComparaisonService.cs    # Levenshtein-based line matching + ecart computation
├── Data/AppDbContext.cs
└── DTOs/                        # DevisDto, FactureDto, ComparaisonDto
```

Key NuGet packages: `Pomelo.EntityFrameworkCore.MySql`, `PDFtoImage`, `SkiaSharp`.

## Frontend structure

```
frontend/src/
├── app/
│   ├── devis/           # List, detail, import
│   └── factures/        # List, detail, import, comparaison
├── components/
│   ├── PdfUploadForm.tsx     # react-dropzone wrapper
│   ├── LignesTable.tsx       # Shared table for devis and facture lines
│   ├── ComparaisonTable.tsx  # Side-by-side diff with color coding
│   └── StatusBadge.tsx       # EnAttente / Extrait / Erreur pill
└── lib/
    ├── api.ts           # Typed fetch wrappers for all endpoints
    └── types.ts         # TypeScript mirrors of C# DTOs
```

## LM Studio configuration

- Set `LmStudio.Model` in `appsettings.json` to the exact model name shown in LM Studio
- The model **must support vision** (e.g. LLaVA, Qwen2-VL, Llama-3.2-Vision)
- The extraction prompt is hardcoded in `ExtractionService.cs` — it instructs the LLM to return strict JSON with no markdown

## Key behaviors

- PDFs are stored under `uploads/devis/` and `uploads/factures/` (relative to the backend working directory)
- Each page is converted to PNG and sent in batches of 4 to avoid LLM context overflow; results are merged in C#
- LLM responses are stripped of markdown fences before JSON parsing; raw responses are saved in `ExtractionBrute` for audit
- Invoice/quote line matching uses Levenshtein distance with a 40% threshold — unmatched lines are flagged as `NonMatche`
- `NEXT_PUBLIC_API_URL` env var controls the backend URL from the frontend (default: `http://localhost:5000`)
