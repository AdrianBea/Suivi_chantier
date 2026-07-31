---
name: project-stack
description: Suivi chantier utilise MySQL (Pomelo) et non SQL Server malgré la description générique du rôle
metadata:
  type: project
---

Le projet "Suivi chantier" utilise **MySQL** via `Pomelo.EntityFrameworkCore.MySql`,
pas SQL Server. `DbContext` : `backend/Data/AppDbContext.cs`.

**Why:** contrainte de stack fixée dès le départ par l'utilisateur (app perso de suivi
de chantier), confirmée dans CLAUDE.md et dans les migrations existantes
(`MySqlValueGenerationStrategy.IdentityColumn`, charset utf8mb4 explicite partout).

**How to apply:** toujours vérifier la chaîne de connexion / le DbContext avant de
supposer SQL Server. Contrainte MySQL importante : `longtext` n'est pas indexable,
donc toute colonne qui doit être indexée ou contrainte unique doit avoir un
`HasMaxLength` explicite (converti en `varchar(n)`). Vu appliqué systématiquement
dans `AppDbContext.OnModelCreating` (ex: `NumeroDevis`, `NumeroFacture`, `Siret`,
`TypeDocument` sur `LlmExchange`).
