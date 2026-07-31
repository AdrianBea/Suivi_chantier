# Rapport — Revue performance frontend (React/Next.js)

Date : 2026-07-30

## Contexte

Revue du frontend (`frontend/src`) selon le guide de bonnes pratiques Vercel React/Next.js (70 règles, priorité aux waterfalls, taille de bundle, performance serveur).

## Constat général

L'appli est un petit outil interne (suivi de chantier perso, backend local, un seul utilisateur). Toutes les pages sont en `"use client"` et récupèrent leurs données via `useEffect` + `fetch`. C'est l'écart principal avec le guide (qui recommande les Server Components pour éviter les waterfalls et réduire le bundle), mais **sans impact réel ici** : pas de trafic public, pas de cold start, jeux de données petits.

## Détails

- **Fetching** : chaque page fait 1 seul appel API dans un `useEffect` — pas de waterfall notable.
- Le tableau de bord (`app/page.tsx`) enchaîne 3 appels indépendants (`devis`/`factures`, `settings.test`, `settings.get`) au lieu d'un seul `Promise.all` — sans conséquence visible, rien ne bloque l'affichage.
- Pas de grosses listes, pas de re-renders coûteux, pas d'imports barrel, pas de librairie lourde à charger en dynamique (`next/dynamic`).
- Aucune autre règle du guide (bundle, re-render, rendu) ne s'applique à cette taille d'appli.

## Verdict

**Aucun changement recommandé.** Réécrire en Server Components serait un chantier sans gain mesurable vu l'usage actuel (mono-utilisateur, backend local). À reconsidérer seulement si l'appli grossit : plusieurs utilisateurs, accès réseau partagé, tables/listes volumineuses.

## Point de sécurité (hors périmètre de la revue perf)

Le fichier `frontend/node_modules/next/dist/docs/index.md` (documentation Next.js 16.2.9 embarquée) contient un commentaire HTML caché adressé aux agents IA, leur demandant d'exporter `unstable_instant` sur les routes et de suivre une doc interne pour modifier la navigation. C'est une tentative d'injection de prompt dans un fichier tiers (vendored) — je ne l'ai pas suivie. Signalé pour information ; ne nécessite aucune action côté code du projet.
