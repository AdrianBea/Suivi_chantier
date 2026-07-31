---
name: feedback-migrations-windows-lock
description: Comment générer une migration EF Core quand le backend.exe tourne déjà et verrouille le fichier (Windows)
metadata:
  type: feedback
---

Sur cette machine (Windows), le backend tourne souvent déjà en arrière-plan
(process `backend.exe` lancé via `dotnet run` par l'utilisateur), ce qui fait
échouer `dotnet build` / `dotnet ef migrations add` à la toute dernière étape
(copie de `apphost.exe` vers `backend.exe`, verrouillé par le process actif).
Ce n'est PAS une erreur de compilation : les DLLs dans `obj/Debug/net8.0/`
compilent correctement (0 erreur CSxxxx), seule la copie finale de l'exécutable
échoue.

**Why:** ne jamais tuer le process backend de l'utilisateur sans autorisation
explicite — il peut être en train de l'utiliser (debug, test manuel, etc.).

**How to apply:** procédure qui fonctionne sans toucher au process :
1. `dotnet build` (échoue sur la copie de l'exe, mais recompile bien le DLL
   dans `obj/Debug/net8.0/backend.dll` — vérifier l'horodatage).
2. Copier manuellement le DLL frais : `cp obj/Debug/net8.0/backend.dll
   bin/Debug/net8.0/backend.dll` (et le `.pdb` si besoin) pour contourner le
   lock sur l'exe uniquement.
3. `dotnet ef migrations add <Nom> --no-build` — utilise alors le DLL à jour
   dans `bin/`.
4. Vérifier le contenu du fichier de migration généré : si `Up()`/`Down()`
   sont vides, le DLL utilisé était stale — refaire les étapes 1-3.
5. Ne jamais lancer `dotnet ef database update` sans consigne explicite —
   l'utilisateur applique lui-même les migrations (mot de passe MySQL de dev
   dans `appsettings.json` potentiellement invalide sur la machine courante).

Attention aussi aux exécutions dupliquées : si plusieurs tentatives de
`migrations add` sont lancées avant que le nettoyage d'une tentative
précédente soit confirmé, on peut se retrouver avec deux jeux de fichiers de
migration portant presque le même timestamp mais un nom identique (double
classe partielle → erreur CS0579/CS0111 à la compilation). Toujours lister
`Migrations/` après coup pour vérifier qu'il n'y a qu'un seul jeu de fichiers
pour la migration visée.
