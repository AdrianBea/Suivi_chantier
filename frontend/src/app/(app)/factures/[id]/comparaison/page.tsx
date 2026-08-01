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

  if (loading) return <main className="max-w-6xl mx-auto px-4 py-10" style={{ color: "var(--nm-text-faint)" }}>Calcul des écarts…</main>;
  if (error) return <main className="max-w-6xl mx-auto px-4 py-10" style={{ color: "var(--nm-danger)" }}>{error}</main>;
  if (!data) return null;

  const ecart = data.ecartTotalTtc;
  const ecartSignificatif = Math.abs(ecart) > 0.01;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <Link href="/factures" style={{ fontSize: 13, color: "var(--nm-text-faint)" }}>← Retour aux factures</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--nm-text-primary)", marginTop: 8, marginBottom: 8 }}>Comparaison devis / facture</h1>
      <p style={{ color: "var(--nm-text-muted)", marginBottom: 32 }}>{data.entrepriseNom}</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div style={{ padding: 16, borderRadius: 8, border: "1px solid var(--nm-border)", background: "var(--nm-base)" }}>
          <p style={{ fontSize: 12, color: "var(--nm-text-faint)", marginBottom: 4 }}>Total TTC devis</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--nm-text-secondary)" }}>{formatEur(data.totalTtcDevis)}</p>
        </div>
        <div style={{ padding: 16, borderRadius: 8, border: "1px solid var(--nm-border)", background: "var(--nm-base)" }}>
          <p style={{ fontSize: 12, color: "var(--nm-text-faint)", marginBottom: 4 }}>Total TTC facture</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--nm-text-secondary)" }}>{formatEur(data.totalTtcFacture)}</p>
        </div>
        <div style={{ padding: 16, borderRadius: 8, border: `1px solid ${ecartSignificatif ? "var(--nm-danger-border)" : "var(--nm-success)"}`, background: ecartSignificatif ? "var(--nm-danger-bg)" : "var(--nm-success-bg)" }}>
          <p style={{ fontSize: 12, color: "var(--nm-text-faint)", marginBottom: 4 }}>Écart total TTC</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: ecartSignificatif ? "var(--nm-danger)" : "var(--nm-success)" }}>
            {ecart > 0 ? "+" : ""}{formatEur(ecart)}
          </p>
        </div>
      </div>

      {data.hasDiscrepancies && (
        <div style={{ marginBottom: 24, padding: 12, background: "var(--nm-accent-soft-bg)", border: "1px solid var(--nm-accent-soft-bg)", borderRadius: 8, fontSize: 13, color: "var(--nm-accent-soft-text)" }}>
          Des écarts ont été détectés. Les lignes surlignées en orange n&apos;ont pas de correspondance dans le devis.
        </div>
      )}

      {!data.hasDiscrepancies && (
        <div style={{ marginBottom: 24, padding: 12, background: "var(--nm-success-bg)", border: "1px solid var(--nm-success)", borderRadius: 8, fontSize: 13, color: "var(--nm-success)" }}>
          Aucun écart significatif détecté entre le devis et la facture.
        </div>
      )}

      <ComparaisonTable lignes={data.lignes} />
    </main>
  );
}
