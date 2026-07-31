"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ComparaisonTable } from "@/components/ComparaisonTable";
import { api } from "@/lib/api";
import { formatEur } from "@/lib/format";
import { ComparaisonDto } from "@/lib/types";

export default function ComparaisonPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ComparaisonDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.factures
      .comparaison(Number(id))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="max-w-6xl mx-auto px-4 py-10" style={{ color: "#666260" }}>Calcul des écarts…</main>;
  if (error) return <main className="max-w-6xl mx-auto px-4 py-10" style={{ color: "#F87171" }}>{error}</main>;
  if (!data) return null;

  const ecart = data.ecartTotalHt;
  const ecartSignificatif = Math.abs(ecart) > 0.01;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <Link href="/factures" style={{ fontSize: 13, color: "#666260" }}>← Retour aux factures</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#F0EDE8", marginTop: 8, marginBottom: 8 }}>Comparaison devis / facture</h1>
      <p style={{ color: "#888480", marginBottom: 32 }}>{data.entrepriseNom}</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div style={{ padding: 16, borderRadius: 8, border: "1px solid #2C2C2C", background: "#1E1E1E" }}>
          <p style={{ fontSize: 12, color: "#666260", marginBottom: 4 }}>Total HT devis</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#E8E5E2" }}>{formatEur(data.totalHtDevis)}</p>
        </div>
        <div style={{ padding: 16, borderRadius: 8, border: "1px solid #2C2C2C", background: "#1E1E1E" }}>
          <p style={{ fontSize: 12, color: "#666260", marginBottom: 4 }}>Total HT facture</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#E8E5E2" }}>{formatEur(data.totalHtFacture)}</p>
        </div>
        <div style={{ padding: 16, borderRadius: 8, border: `1px solid ${ecartSignificatif ? "#4A2323" : "#1E3820"}`, background: ecartSignificatif ? "#221212" : "#162216" }}>
          <p style={{ fontSize: 12, color: "#666260", marginBottom: 4 }}>Écart total HT</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: ecartSignificatif ? "#F87171" : "#4ADE80" }}>
            {ecart > 0 ? "+" : ""}{formatEur(ecart)}
          </p>
        </div>
      </div>

      {data.hasDiscrepancies && (
        <div style={{ marginBottom: 24, padding: 12, background: "#2A1D0C", border: "1px solid #4A3410", borderRadius: 8, fontSize: 13, color: "#F0B860" }}>
          Des écarts ont été détectés. Les lignes surlignées en orange n&apos;ont pas de correspondance dans le devis.
        </div>
      )}

      {!data.hasDiscrepancies && (
        <div style={{ marginBottom: 24, padding: 12, background: "#162216", border: "1px solid #1E3820", borderRadius: 8, fontSize: 13, color: "#4ADE80" }}>
          Aucun écart significatif détecté entre le devis et la facture.
        </div>
      )}

      <ComparaisonTable lignes={data.lignes} />
    </main>
  );
}
