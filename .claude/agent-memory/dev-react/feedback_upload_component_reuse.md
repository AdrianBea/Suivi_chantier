---
name: feedback-upload-component-reuse
description: Ne pas généraliser PdfUploadForm pour des uploads non-LLM — préférer un petit composant dédié
metadata:
  type: feedback
---

`PdfUploadForm.tsx` est fortement couplé à l'extraction LLM (sélecteur de mode Image/Texte codé
en dur dans le JSX, accept limité à `.pdf`). Pour un besoin d'upload simple sans extraction
(ex. pièces jointes de facture), ne pas essayer de le généraliser avec des props conditionnelles.

**Why:** Vérification faite le 2026-07-31 — ce composant n'a qu'un seul usage réel dans le repo
(`devis/import/page.tsx`), donc le généraliser pour un deuxième cas d'usage aurait un gain quasi
nul mais un risque de régression sur le flux d'extraction LLM (qui est le cœur de l'app). Le chef
de projet a explicitement laissé le choix (a) généraliser / (b) composant dédié, et (b) a été
retenu et jugé cohérent avec les conventions de l'équipe.

**How to apply:** Avant de toucher à un composant partagé, vérifier son nombre d'usages réels
(`grep` sur le nom du composant) plutôt que de se fier au nombre supposé dans la consigne — ici
la consigne mentionnait "3 usages", en réalité il n'y en avait qu'un. Si un composant partagé n'a
qu'un seul appelant réel, dupliquer/spécialiser plutôt que généraliser est presque toujours le
choix le plus sûr et le plus lazy. Voir [[project-pieces-jointes]].
