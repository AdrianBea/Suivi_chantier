# Suivi Chantier — Frontend

Interface Next.js (App Router, TypeScript, Tailwind) de l'app de suivi de chantier. Voir le [README racine](../README.md) pour la vue d'ensemble du projet (backend, base de données, LLM).

## Démarrage

```bash
npm install
npm run dev
```

UI sur `http://localhost:3000`. Le backend (`cd ../backend && dotnet run`) doit tourner sur `http://localhost:5000` (configurable via `NEXT_PUBLIC_API_URL`).

## Structure

```
src/
├── app/(app)/
│   ├── devis/        # Liste, détail ([id]), import
│   ├── factures/     # Liste, détail ([id] + comparaison), import
│   ├── entreprises/  # Gestion des entreprises
│   ├── import/       # Point d'entrée d'import unifié
│   └── parametres/   # Modèle OpenRouter, clé API (lecture seule)
├── components/        # PdfUploadForm, LignesTable, ComparaisonTable, StatusBadge, ...
└── lib/
    ├── api.ts        # Wrappers fetch typés pour l'API backend
    ├── types.ts      # Miroirs TypeScript des DTOs C#
    ├── csv.ts        # Export CSV
    ├── format.ts     # Formatage dates/montants
    └── status.ts     # Libellés/couleurs des statuts
```

## Notes

- Ce projet utilise une version de Next.js avec des différences par rapport aux conventions habituelles — voir `AGENTS.md` avant de modifier le routing ou les conventions de fichiers.
