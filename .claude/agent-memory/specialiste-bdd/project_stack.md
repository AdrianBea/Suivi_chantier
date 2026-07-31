---
name: project-stack
description: Suivi chantier utilise PostgreSQL (Npgsql) depuis le 2026-07-31, migré depuis MySQL (Pomelo)
metadata:
  type: project
---

Le projet "Suivi chantier" utilise **PostgreSQL** via `Npgsql.EntityFrameworkCore.PostgreSQL`
(9.0.4), pas SQL Server, pas MySQL. `DbContext` : `backend/Data/AppDbContext.cs`.

**Why:** migration décidée et exécutée le 2026-07-31 (dev-aspnet a fait le swap de
provider dans `backend.csproj`/`Program.cs`/`SettingsStore.cs`/`SettingsController.cs`/
`appsettings.json` ; moi-même j'ai régénéré les migrations EF Core à zéro dans
`backend/Migrations/` — base vierge, aucun historique de migration à préserver).
Avant cette date le projet était sous MySQL/Pomelo — c'est désormais faux, ne pas s'y fier.

**How to apply:** toujours vérifier la chaîne de connexion / le DbContext avant de
supposer un SGBD différent. La contrainte MySQL "longtext non indexable" ne s'applique
plus (PostgreSQL indexe `text` sans problème). Les `HasMaxLength` explicites présents
dans `AppDbContext.OnModelCreating` (`NumeroDevis`, `NumeroFacture`, `Siret`,
`TypeDocument` sur `LlmExchange`, colonnes de `PieceJointe`) sont conservés mais pour
d'autres raisons (validation métier, cohérence DTO/API) — pas une contrainte technique
du SGBD. Les colonnes `decimal?` (Devis/Facture/LignePoste/LigneFacture) portent des
`.HasPrecision(18, 2)` explicites dans le `DbContext`, ce qui sort en `numeric(18,2)`
dans les migrations générées — Npgsql ne déduit pas cette précision par défaut comme
le faisait Pomelo.
