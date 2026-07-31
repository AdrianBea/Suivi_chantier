---
name: project-llm-openrouter
description: OpenRouter est le seul fournisseur LLM depuis le 2026-07-31 — plus de provider local, BaseUrl en dur, clé API en .env uniquement
metadata:
  type: project
---

Le projet "Suivi chantier" ne parle qu'à **OpenRouter** depuis le 2026-07-31. Tout le
code "LM Studio" / provider local a été supprimé (pas déprécié) : `OpenRouterService`
remplace `LmStudioService`, le client HTTP nommé est `"openrouter"`.

**Why:** le mode LLM local n'était plus utilisé, et le backend traitait déjà les deux
fournisseurs de façon identique (même API OpenAI-compatible, seule différence le header
`Authorization`) — garder le toggle revenait à maintenir du code mort. Décision explicite
de ne PAS créer d'interface générique `ILlmService` : un seul provider réel, pas
d'abstraction spéculative.

**How to apply:**
- `BaseUrl = "https://openrouter.ai/api/v1"` est une `internal const` dans
  `OpenRouterService`, réutilisée par `SettingsController`. Elle n'est configurable nulle
  part — ne pas réintroduire de champ d'URL en base ou dans l'UI.
- La clé API vit UNIQUEMENT dans `backend/.env` sous `SUIVI_CHANTIER_OpenRouter__ApiKey`
  (jamais commitée). `appsettings.json` ne contient que `OpenRouter:Model`.
- `GET /api/settings` renvoie la clé **masquée** (`••••••••` + 4 derniers caractères).
  Convention à respecter côté front : renvoyer le masque tel quel dans le `PUT` signifie
  "ne pas changer la clé". Ne jamais vider ce champ au chargement du formulaire.
- `POST /api/settings/models` prend un **body JSON** `{apiKey}`, ce n'est pas une query
  string. `POST /api/settings/test-db` n'existe plus.
- La config BDD est sortie du panneau Paramètres : la connection string est lue au
  démarrage via `IConfiguration.GetConnectionString("Default")`, plus par un settings
  store modifiable à chaud. Changer de base impose un redémarrage. Voir
  [[project-stack-postgres]].
