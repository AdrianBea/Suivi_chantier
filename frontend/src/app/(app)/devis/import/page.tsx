"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PdfUploadForm } from "@/components/PdfUploadForm";
import { api } from "@/lib/api";

type Phase =
  | { kind: "idle" }
  | { kind: "polling"; devisId: number }
  | { kind: "error"; message: string };

export default function ImportDevisPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const handleUpload = async (file: File, mode: string) => {
    const devis = await api.devis.import(file, mode);
    setPhase({ kind: "polling", devisId: devis.id });
  };

  useEffect(() => {
    if (phase.kind !== "polling") return;
    const devisId = phase.devisId;

    const interval = setInterval(async () => {
      try {
        const devis = await api.devis.getById(devisId);
        if (devis.statut === "Extrait") {
          clearInterval(interval);
          router.push(`/devis/${devisId}`);
        } else if (devis.statut === "Erreur") {
          clearInterval(interval);
          setPhase({ kind: "error", message: "L'extraction a échoué. Vérifiez que le fichier est un devis valide et réessayez." });
        }
      } catch {
        clearInterval(interval);
        setPhase({ kind: "error", message: "Impossible de vérifier l'avancement de l'analyse. Vérifiez votre connexion et réessayez." });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [phase, router]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/devis" style={{ fontSize: 13, color: "var(--nm-text-faint)" }}>← Retour aux devis</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--nm-text-primary)", marginTop: 8, marginBottom: 24 }}>Importer un devis</h1>

      {phase.kind === "idle" && (
        <>
          <PdfUploadForm onUpload={handleUpload} label="Déposer le PDF du devis ici" />

          <div style={{ marginTop: 24, padding: 16, background: "var(--nm-info-bg)", border: "1px solid var(--nm-info)", borderRadius: 8, fontSize: 13, color: "var(--nm-info)" }}>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>Format PDF attendu</p>
            <ul style={{ listStyle: "disc", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, color: "var(--nm-info)" }}>
              <li>Devis émis par une entreprise (pas un bon de commande)</li>
              <li>Contient les lignes de poste avec quantités et prix unitaires</li>
              <li>Le total HT et TTC doivent être lisibles</li>
              <li>PDF non protégé par mot de passe</li>
            </ul>
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: "var(--nm-text-faint)" }}>
            L&apos;analyse automatique peut prendre 1 à 3 minutes selon la taille du document.
          </p>
        </>
      )}

      {phase.kind === "polling" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16, color: "var(--nm-text-muted)" }}>
          <svg className="animate-spin" style={{ height: 32, width: 32, color: "var(--nm-info)" }} viewBox="0 0 24 24" fill="none">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--nm-text-secondary)" }}>Analyse du document en cours…</p>
          <p style={{ fontSize: 13, color: "var(--nm-text-faint)" }}>Cela peut prendre 1 à 3 minutes. Ne fermez pas cette page.</p>
        </div>
      )}

      {phase.kind === "error" && (
        <div style={{ padding: 16, background: "var(--nm-danger-bg)", border: "1px solid var(--nm-danger-border)", borderRadius: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--nm-danger)", marginBottom: 12 }}>{phase.message}</p>
          <button
            onClick={() => setPhase({ kind: "idle" })}
            style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      )}
    </main>
  );
}
