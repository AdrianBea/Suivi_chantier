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

  if (error) return <div style={{ fontSize: 12, color: "#F87171" }}>{error}</div>;
  if (echanges === null) return <div style={{ fontSize: 12, color: "#888480" }}>Chargement…</div>;
  if (echanges.length === 0) return <div style={{ fontSize: 12, color: "#666260" }}>Aucun échange enregistré pour ce document.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {echanges.map((e) => {
        const isOpen = ouvert === e.id;
        return (
          <div key={e.id} style={{ border: "1px solid #2C2C2C", borderRadius: 8, overflow: "hidden" }}>
            <button
              onClick={() => setOuvert(isOpen ? null : e.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#252525", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: "monospace", background: e.succes ? "#162216" : "#221212", color: e.succes ? "#4ADE80" : "#F87171" }}>
                {e.succes ? "OK" : "ERREUR"}
              </span>
              <span style={{ fontSize: 12, color: "#E8E5E2", fontWeight: 600 }}>Batch {e.batch}</span>
              <span style={{ fontSize: 11, color: "#888480", fontFamily: "monospace" }}>{e.nbImages} img · {e.dureeMs} ms · {e.modele}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#666260", fontFamily: "monospace" }}>{new Date(e.createdAt).toLocaleString("fr-FR")}</span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
                <path d="M2 4l4 4 4-4" stroke="#888480" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <div style={{ padding: "14px 16px", background: "#1A1A1A", display: "flex", flexDirection: "column", gap: 12 }}>
                {e.erreur && (
                  <Bloc titre="Erreur" couleur="#F87171">{e.erreur}</Bloc>
                )}
                <Bloc titre="Prompt utilisateur">{e.userPrompt}</Bloc>
                <Bloc titre="Réponse brute du LLM">{e.reponseBrute || "(vide)"}</Bloc>
                <details>
                  <summary style={{ fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", cursor: "pointer" }}>System prompt</summary>
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
      <div style={{ fontSize: 10, color: couleur ?? "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{titre}</div>
      <pre style={{ ...preStyle, ...(couleur ? { color: couleur, borderColor: "#3A1818" } : {}) }}>{children}</pre>
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  background: "#111",
  border: "1px solid #2C2C2C",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-jetbrains-mono), monospace",
  color: "#C0BDB8",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 320,
  overflowY: "auto",
};
