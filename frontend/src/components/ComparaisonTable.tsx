import { formatEur } from "@/lib/format";
import { LigneComparaisonDto } from "@/lib/types";

export function ComparaisonTable({ lignes }: { lignes: LigneComparaisonDto[] }) {
  if (lignes.length === 0) {
    return <p style={{ fontSize: 13, color: "#666260" }}>Aucune ligne à comparer.</p>;
  }

  const th: React.CSSProperties = { padding: "8px 16px", textAlign: "left", fontWeight: 500, color: "#666260" };
  const thRight: React.CSSProperties = { ...th, textAlign: "right" };
  const td: React.CSSProperties = { padding: "8px 16px", color: "#C0BDB8" };
  const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

  return (
    <div className="overflow-x-auto" style={{ border: "1px solid #2C2C2C", borderRadius: 8 }}>
      <table style={{ minWidth: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead style={{ background: "#1E1E1E" }}>
          <tr>
            <th style={th}>Description (facture)</th>
            <th style={th}>Description (devis)</th>
            <th style={thRight}>Qté devis</th>
            <th style={thRight}>Qté facture</th>
            <th style={thRight}>PU devis</th>
            <th style={thRight}>PU facture</th>
            <th style={thRight}>Écart prix</th>
            <th style={thRight}>Écart qté</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.factureLigneId} style={{ borderTop: "1px solid #242424", background: l.nonMatche ? "#2A1D0C" : undefined }}>
              <td style={{ ...td, maxWidth: 320, color: "#E8E5E2" }}>{l.descriptionFacture}</td>
              <td style={{ ...td, maxWidth: 320 }}>
                {l.nonMatche ? <span style={{ color: "#F0B860", fontWeight: 500 }}>Non trouvé dans le devis</span> : l.descriptionDevis}
              </td>
              <td style={tdRight}>{l.quantiteDevis?.toLocaleString("fr-FR") ?? "—"}</td>
              <td style={tdRight}>{l.quantiteFacture?.toLocaleString("fr-FR") ?? "—"}</td>
              <td style={tdRight}>{formatEur(l.prixUnitaireDevis)}</td>
              <td style={tdRight}>{formatEur(l.prixUnitaireFacture)}</td>
              <td style={{ ...tdRight, fontWeight: 500, color: ecartColor(l.ecartPrix) }}>
                {l.ecartPrix != null ? formatEur(l.ecartPrix) : "—"}
              </td>
              <td style={{ ...tdRight, fontWeight: 500, color: ecartColor(l.ecartQuantite) }}>
                {l.ecartQuantite != null ? l.ecartQuantite.toLocaleString("fr-FR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ecartColor(v?: number | null) {
  if (v == null || Math.abs(v) < 0.01) return "#888480";
  return v > 0 ? "#F87171" : "#4ADE80";
}
