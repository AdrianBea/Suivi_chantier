---
name: feedback-orchestration-migration
description: Séquencement validé pour un changement transverse de stack — swap provider avant régénération des migrations, et vérifier soi-même les livrables
metadata:
  type: feedback
---

Sur un changement transverse de provider/stack, le séquencement qui a fonctionné :
dev-aspnet fait le swap complet (csproj + config + DbContext) AVANT que specialiste-bdd
ne régénère les migrations, et la tâche purement cosmétique du front part en parallèle
dès le début. specialiste-bdd doit recevoir explicitement la consigne de corriger sa
propre mémoire projet quand la stack qu'elle décrit devient obsolète.

**Why:** régénérer une migration avant le swap produirait du code du mauvais provider.
Pendant la phase intermédiaire, `dotnet build` échoue légitimement (les anciennes
migrations référencent l'ancien provider) — il faut prévenir l'agent que cet échec est
attendu, sinon il tente de "réparer" en supprimant des fichiers hors de son périmètre.

**How to apply:** annoncer à chaque agent l'état de build attendu à son étape, et lui
interdire nommément les fichiers hors périmètre. Vérifier les livrables soi-même
(grep/diff/build) plutôt que de se fier aux rapports : sur cette mission un agent a
modifié 3 fichiers de plus que demandé (légitimes, des libellés MySQL visibles dans l'UI)
et un changement sans rapport avec la mission est apparu dans `Modal.tsx` sans être
déclaré. Voir [[project-stack-postgres]]. Sur la mission OpenRouter (2026-07-31) le
séquencement backend→frontend a bien fonctionné : lire soi-même le contrat d'API dans le
controller livré, plutôt que d'attendre le rapport de l'agent, a permis de briefer le
front avec la forme réelle des endpoints (POST+body et clé masquée) là où le plan était
approximatif.
