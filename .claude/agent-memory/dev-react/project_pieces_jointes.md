---
name: project-pieces-jointes
description: Contrat API et implémentation des pièces jointes de facture (upload/liste/suppression)
metadata:
  type: project
---

Fonctionnalité « pièces jointes » sur les factures livrée le 2026-07-31 : endpoints
`/api/factures/{id}/pieces-jointes` (POST multipart, GET liste, GET binaire inline, DELETE),
DTO `PieceJointeDto` camelCase (`id, nomFichier, contentType, tailleOctets, libelle?, createdAt`).
`FactureDto.piecesJointes` est peuplé sur `GET /api/factures/{id}` mais volontairement vide sur
la liste paginée `GET /api/factures` — ne pas s'appuyer dessus hors de la modale de détail.

**Why:** Décision assumée du back pour éviter de charger les pièces jointes dans la liste paginée
(perf). La modale de détail (`FactureModal.tsx`) recharge la facture via `api.factures.getById` +
`applyUpdate` après chaque upload/suppression plutôt que de gérer un state parallèle.

**How to apply:** Si une nouvelle vue a besoin des pièces jointes d'une facture, fetch
`getById`, ne pas supposer que `piecesJointes` est présent depuis `list()`. Voir aussi
[[feedback-upload-component-reuse]].
