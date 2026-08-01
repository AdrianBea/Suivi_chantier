/**
 * Vérifie que ListTable injecte bien un data-label par cellule : c'est ce qui
 * permet au CSS (.table-to-cards, <768px) de restituer l'en-tête de colonne
 * quand chaque ligne devient une carte. Sans ces attributs, les cartes mobiles
 * afficheraient des valeurs sans libellé.
 *
 *   node --experimental-strip-types src/components/ListTable.test.tsx
 */
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ListTable } from "./ListTable";

const COLUMNS = [
  { label: "Entreprise", width: "1fr" },
  { label: "Montant", width: "110px", align: "right" as const },
  { label: "", width: "52px" },
];

const html = renderToStaticMarkup(
  <ListTable
    columns={COLUMNS}
    rows={[{ id: 1, nom: "Dupont Maçonnerie", montant: "54 240 €" }]}
    rowKey={(r) => r.id}
    onRowClick={() => {}}
    emptyLabel="Aucun résultat"
    renderRow={(r) => (
      <>
        <div>{r.nom}</div>
        <div>{r.montant}</div>
        <div>›</div>
      </>
    )}
  />,
);

// renderRow renvoie un fragment : les data-label doivent atterrir sur les cellules,
// pas sur le fragment (le bug que ce test verrouille).
assert.match(html, /data-label="Entreprise"[^>]*>Dupont Maçonnerie/, "libellé de la 1re colonne manquant");
assert.match(html, /data-label="Montant"[^>]*>54 240 €/, "libellé de la 2e colonne manquant");
assert.match(html, /data-label=""/, "la colonne sans titre doit porter un data-label vide");

// les crochets CSS doivent être présents
assert.match(html, /class="[^"]*table-to-cards[^"]*"/, "conteneur .table-to-cards manquant");
assert.match(html, /class="[^"]*tc-head[^"]*"/, "en-tête .tc-head manquant");
assert.match(html, /class="[^"]*tc-row[^"]*"/, "ligne .tc-row manquante");

// une liste vide ne doit pas planter ni produire de ligne
const empty = renderToStaticMarkup(
  <ListTable
    columns={COLUMNS}
    rows={[]}
    rowKey={(r: { id: number }) => r.id}
    onRowClick={() => {}}
    emptyLabel="Aucun résultat"
    renderRow={() => <><div /><div /><div /></>}
  />,
);
assert.match(empty, /Aucun résultat/, "état vide non rendu");
assert.doesNotMatch(empty, /tc-row/, "aucune ligne ne doit être rendue quand rows est vide");

console.log("ListTable : data-label injectés correctement ✓");
