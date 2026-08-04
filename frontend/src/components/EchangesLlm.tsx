"use client";

import { useEffect, useState } from "react";
import { LlmExchangeDto } from "@/lib/types";

/**
 * Historique des échanges avec le LLM pour un document (devis ou facture).
 * `load` fournit les échanges (api.devis.echanges ou api.factures.echanges).
 */
export function EchangesLlm({ load }: { load: () => Promise<LlmExchangeDto[]> }) {
  const [echanges, setEchanges] = useState<LlmExchangeDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<number | null>(null);

  useEffect(() => {
    load()
      .then(setEchanges)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"));
  }, [load]);

  if (error) return <div style={{ fontSize: 12, color: "var(--nm-danger)" }}>{error}</div>;
  if (echanges === null) return <div style={{ fontSize: 12, color: "var(--nm-text-muted)" }}>Chargement…</div>;
  if (echanges.length === 0) return <div style={{ fontSize: 12, color: "var(--nm-text-faint)" }}>Aucun échange enregistré pour ce document.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {echanges.map((e) => {
        const isOpen = ouvert === e.id;
        return (
          <div key={e.id} style={{ border: "1px solid var(--nm-border)", borderRadius: 8, overflow: "hidden" }}>
            <button
              onClick={() => setOuvert(isOpen ? null : e.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--nm-base-sunken)", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: "monospace", background: e.succes ? "var(--nm-success-bg)" : "var(--nm-danger-bg)", color: e.succes ? "var(--nm-success)" : "var(--nm-danger)" }}>
                {e.succes ? "OK" : "ERREUR"}
              </span>
              <span style={{ fontSize: 12, color: "var(--nm-text-secondary)", fontWeight: 600 }}>Lot {e.batch}</span>
              <span style={{ fontSize: 11, color: "var(--nm-text-muted)", fontFamily: "monospace" }}>{e.nbImages} page(s) · {(e.dureeMs / 1000).toFixed(1)} s · {e.modele}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--nm-text-faint)", fontFamily: "monospace" }}>{new Date(e.createdAt).toLocaleString("fr-FR")}</span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
                <path d="M2 4l4 4 4-4" stroke="var(--nm-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <div style={{ padding: "14px 16px", background: "var(--nm-base-raised)", display: "flex", flexDirection: "column", gap: 12 }}>
                {e.erreur && (
                  <Bloc titre="Erreur" couleur="var(--nm-danger)">{e.erreur}</Bloc>
                )}
                <Bloc titre="Contenu envoyé pour analyse">{e.userPrompt}</Bloc>
                <Bloc titre="Résultat de l'analyse">{e.reponseBrute || "(vide)"}</Bloc>
                <details>
                  <summary style={{ fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", cursor: "pointer" }}>Consignes d&apos;analyse</summary>
                  <pre style={preStyle}>{e.systemPrompt}</pre>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Bloc({ titre, couleur, children }: { titre: string; couleur?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: couleur ?? "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{titre}</div>
      <pre style={{ ...preStyle, ...(couleur ? { color: couleur, borderColor: "var(--nm-danger-border)" } : {}) }}>{children}</pre>
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  background: "var(--nm-base-sunken)",
  border: "1px solid var(--nm-border)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-jetbrains-mono), monospace",
  color: "var(--nm-text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 320,
  overflowY: "auto",
};
