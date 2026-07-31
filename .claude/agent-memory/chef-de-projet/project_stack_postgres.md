---
name: project-stack-postgres
description: Suivi chantier tourne sur PostgreSQL/Npgsql depuis le 2026-07-31 (migré depuis MySQL/Pomelo), base repartie de zéro
metadata:
  type: project
---

Le backend "Suivi chantier" utilise **PostgreSQL** via `Npgsql.EntityFrameworkCore.PostgreSQL`
9.0.4. Migration depuis MySQL/Pomelo réalisée le 2026-07-31.

**Why:** décision de l'utilisateur, avec l'hypothèse actée que la base serait vierge après
bascule — les 5 anciennes migrations Pomelo ont donc été supprimées et remplacées par une
unique migration `InitialCreate` regénérée de zéro, sans aucune migration de données.
Décision d'architecture prise au passage : précision explicite `HasPrecision(18, 2)` sur les
14 colonnes `decimal?` (montants et quantités de Devis/Facture/LignePoste/LigneFacture),
parce que ces colonnes héritaient auparavant du défaut MySQL `decimal(65,30)` et que Npgsql
serait parti sur un `numeric` sans limite.

**How to apply:** ne plus jamais supposer MySQL sur ce repo (les mémoires antérieures des
spécialistes le disaient et étaient fausses). La contrainte MySQL "longtext non indexable"
ne s'applique plus, mais les `HasMaxLength` du DbContext ont été conservés volontairement.
Le format de connection string est `Host=...;Database=...;Username=...;Password=...` — les
propriétés C# de `DatabaseSettings` (`Server`, `User`) ont gardé leurs noms d'origine pour
ne pas casser le DTO exposé au front, seul le format sérialisé a changé.
