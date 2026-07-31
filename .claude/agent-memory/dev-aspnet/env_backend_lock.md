---
name: env-backend-lock
description: Le process backend tourne en continu et verrouille bin/Debug/net8.0/backend.exe, bloquant tout build complet et toute migration EF Core
metadata:
  type: project
---

Le processus `backend` (ASP.NET Core, lancé via `dotnet run`) tourne en
permanence pendant les sessions de dev sur ce repo et verrouille
`backend\bin\Debug\net8.0\backend.exe`.

**Why:** un `dotnet build` complet échoue systématiquement avec
MSB3027/MSB3021 (copie de l'apphost bloquée) tant que le process tourne.
Ce n'est jamais une erreur de code — c'est un verrou de fichier Windows.
`dotnet ef migrations add` échoue pour la même raison : EF Core force un
build complet (pas de `-t:Compile`) avant de générer la migration.

**How to apply:**
- Pour vérifier que le code compile : utiliser `dotnet build -t:Compile`
  (compile sans copier l'exe, contourne le verrou, code source only).
- Ne jamais tuer le process backend, ne jamais lancer `dotnet run` ou
  `dotnet ef database update` soi-même — c'est explicitement interdit par
  les consignes de tâche à chaque fois.
- Si une migration EF Core est nécessaire et échoue à cause du verrou :
  ne pas s'acharner, signaler clairement dans le rapport de fin de tâche
  que la migration reste à générer manuellement (par exemple après un
  redémarrage du backend par l'utilisateur), plutôt que de forcer un
  contournement risqué (kill process, etc.).
