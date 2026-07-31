"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { DevisDto, FactureDto } from "@/lib/types";

// ─── types ───────────────────────────────────────────────────────────────────

type DocType = "DEVIS" | "FAC";

type QueueEntry = {
  id: string;
  name: string;
  docType: DocType;
  status: "processing" | "extracted" | "error" | "saved";
  error?: string;
  // filled after extraction
  devisId?: number;
  factureId?: number;
  entreprise?: string;
  lot?: string;
  montantHT?: number;
  montantTTC?: number;
  date?: string;
  lignesCount?: number;
  lignes?: { designation: string; total: number }[];
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
}

function statusBg(s: QueueEntry["status"]) {
  return s === "extracted" ? "var(--nm-success-bg)" : s === "saved" ? "var(--nm-success-bg)" : s === "processing" ? "var(--nm-accent-soft-bg)" : "var(--nm-danger-bg)";
}
function statusColor(s: QueueEntry["status"]) {
  return s === "extracted" ? "var(--nm-success)" : s === "saved" ? "var(--nm-success)" : s === "processing" ? "var(--nm-warning)" : "var(--nm-danger)";
}
function statusLabel(s: QueueEntry["status"]) {
  return s === "extracted" ? "EXTRAIT" : s === "saved" ? "ENREGISTRÉ" : s === "processing" ? "EN COURS" : "ERREUR";
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ImportPage() {
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultDocType, setDefaultDocType] = useState<DocType>(
    searchParams.get("type") === "FAC" ? "FAC" : "DEVIS"
  );
  const [mode, setMode] = useState<"Image" | "Texte">("Image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = queue.find((e) => e.id === selectedId) ?? null;

  // poll processing entries
  useEffect(() => {
    const processing = queue.filter((e) => e.status === "processing");
    if (!processing.length) return;

    const timer = setInterval(async () => {
      for (const entry of processing) {
        try {
          if (entry.docType === "DEVIS" && entry.devisId) {
            const d = await api.devis.getById(entry.devisId);
            if (d.statut === "Extrait" || d.statut === "Erreur") {
              updateFromDevis(entry.id, d);
            }
          } else if (entry.docType === "FAC" && entry.factureId) {
            const f = await api.factures.getById(entry.factureId);
            if (f.statut === "Extrait" || f.statut === "Erreur") {
              updateFromFacture(entry.id, f);
            }
          }
        } catch {
          // ponytail: erreur réseau transitoire pendant le polling — on ignore et on réessaie au prochain tick plutôt que d'échouer l'entrée
        }
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [queue]);

  function updateFromDevis(id: string, d: DevisDto) {
    setQueue((q) => q.map((e) => e.id !== id ? e : {
      ...e,
      status: d.statut === "Extrait" ? "extracted" : "error",
      error: d.statut === "Erreur" ? "Extraction échouée" : undefined,
      entreprise: d.entreprise?.nom,
      lot: d.lot ?? undefined,
      montantHT: d.totalHt ?? undefined,
      montantTTC: d.totalTtc ?? undefined,
      date: d.dateDevis ? new Date(d.dateDevis).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : undefined,
      lignesCount: d.lignes.length,
      lignes: d.lignes.map((l) => ({ designation: l.description, total: l.totalLigne ?? 0 })),
    }));
  }

  function updateFromFacture(id: string, f: FactureDto) {
    setQueue((q) => q.map((e) => e.id !== id ? e : {
      ...e,
      status: f.statut === "Extrait" ? "extracted" : "error",
      error: f.statut === "Erreur" ? "Extraction échouée" : undefined,
      entreprise: f.entreprise?.nom,
      montantHT: f.totalHt ?? undefined,
      montantTTC: f.totalTtc ?? undefined,
      date: f.dateFacture ? new Date(f.dateFacture).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : undefined,
      lignesCount: f.lignes.length,
      lignes: f.lignes.map((l) => ({ designation: l.description, total: l.totalLigne ?? 0 })),
    }));
  }

  async function enqueue(file: File, docType: DocType) {
    const id = `${Date.now()}-${Math.random()}`;
    const entry: QueueEntry = { id, name: file.name, docType, status: "processing" };
    setQueue((q) => [...q, entry]);
    setSelectedId(id);

    try {
      if (docType === "DEVIS") {
        const d = await api.devis.import(file, mode);
        setQueue((q) => q.map((e) => e.id === id ? { ...e, devisId: d.id } : e));
      } else {
        const f = await api.factures.import(file, undefined, mode);
        setQueue((q) => q.map((e) => e.id === id ? { ...e, factureId: f.id } : e));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur import";
      setQueue((q) => q.map((e) => e.id === id ? { ...e, status: "error", error: msg } : e));
    }
  }

  const [rejecting, setRejecting] = useState<string | null>(null); // id en cours de suppression
  const [confirmReject, setConfirmReject] = useState<QueueEntry | null>(null);

  async function rejectEntry(entry: QueueEntry) {
    setRejecting(entry.id);
    try {
      if (entry.docType === "DEVIS" && entry.devisId) await api.devis.delete(entry.devisId);
      else if (entry.docType === "FAC" && entry.factureId) await api.factures.delete(entry.factureId);
      setQueue((q) => q.filter((e) => e.id !== entry.id));
      setSelectedId((cur) => (cur === entry.id ? null : cur));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Suppression échouée";
      setQueue((q) => q.map((e) => e.id === entry.id ? { ...e, status: "error", error: msg } : e));
    } finally {
      setRejecting(null);
    }
  }

  function handleFiles(files: FileList | null, docType: DocType) {
    if (!files) return;
    Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".pdf")).forEach((f) => enqueue(f, docType));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files, defaultDocType);
  }

  const extractedCount = queue.filter((e) => e.status === "extracted" || e.status === "saved").length;
  const errorCount = queue.filter((e) => e.status === "error").length;

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* 2-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 400px)", minHeight: "calc(100vh - 52px)" }}>

        {/* LEFT */}
        <div style={{ padding: "32px 32px 56px 40px", borderRight: "1px solid var(--nm-base-sunken)", overflowY: "auto" }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "var(--nm-accent)", letterSpacing: "0.18em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 8 }}>OpenRouter · PDF → PostgreSQL</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>Import de documents</h1>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginTop: 6 }}>Glissez vos devis et factures PDF — analyse automatique par LLM local</div>
          </div>

          {/* type selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["DEVIS", "FAC"] as DocType[]).map((t) => (
              <button key={t} onClick={() => setDefaultDocType(t)} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", borderColor: defaultDocType === t ? "var(--nm-accent)" : "var(--nm-border-strong)", background: defaultDocType === t ? "rgba(249,115,22,0.1)" : "transparent", color: defaultDocType === t ? "var(--nm-accent)" : "var(--nm-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                {t === "DEVIS" ? "Devis" : "Facture"}
              </button>
            ))}
            <span style={{ fontSize: 12, color: "var(--nm-text-disabled)", alignSelf: "center", marginLeft: 4 }}>Type par défaut pour le glisser-déposer</span>
          </div>

          {/* mode selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["Image", "Texte"] as const).map((mo) => (
              <button key={mo} onClick={() => setMode(mo)} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", borderColor: mode === mo ? "var(--nm-accent)" : "var(--nm-border-strong)", background: mode === mo ? "rgba(249,115,22,0.1)" : "transparent", color: mode === mo ? "var(--nm-accent)" : "var(--nm-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                {mo}
              </button>
            ))}
            <span style={{ fontSize: 12, color: "var(--nm-text-disabled)", alignSelf: "center", marginLeft: 4 }}>Traitement LLM — Texte bascule en Image si le PDF est scanné</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragOver ? "var(--nm-accent)" : "var(--nm-border-strong)"}`, borderRadius: 14, background: dragOver ? "rgba(249,115,22,0.06)" : "var(--nm-base-raised)", padding: "52px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, cursor: "pointer", transition: "border-color 0.2s, background 0.2s", marginBottom: 32 }}
          >
            <div style={{ width: 62, height: 62, borderRadius: 14, background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke={dragOver ? "var(--nm-accent)" : "var(--nm-text-faint)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--nm-text-secondary)", marginBottom: 6 }}>{dragOver ? "Relâchez pour importer" : "Glissez vos PDF ici"}</div>
              <div style={{ fontSize: 12, color: "var(--nm-text-muted)", lineHeight: 1.7 }}>Format PDF · Devis ou factures · Max. 50 Mo<br/>OpenRouter extrait les données automatiquement</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files, defaultDocType)} />
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: "9px 24px", background: "var(--nm-accent)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Parcourir…
            </button>
          </div>

          {/* Queue header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace" }}>File d&apos;attente</span>
              <span style={{ padding: "2px 8px", background: "var(--nm-base-raised)", borderRadius: 20, fontSize: 10, fontFamily: "monospace", color: "var(--nm-text-tertiary)" }}>{queue.length}</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: "monospace", display: "flex", gap: 10 }}>
              <span style={{ color: "var(--nm-success)" }}>{extractedCount} extraits</span>
              <span style={{ color: "var(--nm-text-faint)" }}>·</span>
              <span style={{ color: "var(--nm-danger)" }}>{errorCount} erreur(s)</span>
            </div>
          </div>

          {/* Queue rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {queue.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--nm-text-faint)" }}>Aucun fichier importé pour l&apos;instant</div>
            )}
            {queue.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(entry.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(entry.id);
                  }
                }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 9, background: selectedId === entry.id ? "rgba(249,115,22,0.06)" : "transparent", border: `1px solid ${selectedId === entry.id ? "rgba(249,115,22,0.35)" : "var(--nm-base-sunken)"}`, cursor: "pointer", transition: "background 0.15s" }}
              >
                {/* icon */}
                <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--nm-base-sunken)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {entry.status === "processing" ? (
                    <div style={{ width: 18, height: 18, border: "2.5px solid var(--nm-border-strong)", borderTopColor: "var(--nm-accent)", borderRadius: "50%", animation: "spin 0.85s linear infinite" }}/>
                  ) : (
                    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                      <path d="M9 0H2C.9 0 0 .9 0 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5L9 0z" fill="var(--nm-base-raised)"/>
                      <path d="M9 0v5h5" fill="var(--nm-border-strong)"/>
                      <path d="M3 9h8M3 12h5" stroke={entry.status === "error" ? "var(--nm-danger)" : "var(--nm-success)"} strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>

                {/* info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>{entry.name}</div>
                  <div style={{ fontSize: 11, color: "var(--nm-text-muted)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden" }}>
                    {entry.status === "processing" && <span style={{ opacity: 0.7 }}>Analyse en cours…</span>}
                    {entry.status === "error" && <span style={{ color: "var(--nm-danger)" }}>{entry.error}</span>}
                    {(entry.status === "extracted" || entry.status === "saved") && entry.entreprise && (
                      <>
                        <span style={{ color: "var(--nm-text-muted)" }}>{entry.entreprise}</span>
                        {entry.lot && <><span style={{ color: "var(--nm-text-disabled)" }}>·</span><span>{entry.lot}</span></>}
                        {entry.montantHT != null && <><span style={{ color: "var(--nm-text-disabled)" }}>·</span><span style={{ fontFamily: "monospace", color: "var(--nm-text-tertiary)" }}>{fmt(entry.montantHT)} HT</span></>}
                        {entry.montantTTC != null && <><span style={{ color: "var(--nm-text-disabled)" }}>·</span><span style={{ fontFamily: "monospace", color: "var(--nm-text-tertiary)" }}>{fmt(entry.montantTTC)} TTC</span></>}
                      </>
                    )}
                  </div>
                </div>

                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "monospace", background: statusBg(entry.status), color: statusColor(entry.status), flexShrink: 0 }}>{statusLabel(entry.status)}</span>
                {entry.status === "error" && (entry.devisId || entry.factureId) && (
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setConfirmReject(entry); }}
                    disabled={rejecting === entry.id}
                    title="Supprimer de la base"
                    aria-label="Supprimer de la base"
                    style={{ width: 24, height: 24, background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="var(--nm-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ background: "var(--nm-base)", overflowY: "auto", position: "sticky", top: 52, height: "calc(100vh - 52px)" }}>
          {selected && (selected.status === "extracted" || selected.status === "saved") ? (
            <div style={{ padding: "28px 24px" }}>
              {/* header */}
              <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--nm-base-sunken)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ padding: "4px 11px", borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "monospace", background: selected.docType === "DEVIS" ? "var(--nm-info-bg)" : "var(--nm-accent-soft-bg)", color: selected.docType === "DEVIS" ? "var(--nm-info)" : "var(--nm-accent-soft-text)" }}>{selected.docType}</span>
                  <span style={{ fontSize: 11, color: "var(--nm-text-muted)", fontFamily: "monospace" }}>{selected.lignesCount ?? 0} lignes</span>
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 5 }}>{selected.entreprise ?? "—"}</h2>
                <div style={{ fontSize: 11, color: "var(--nm-text-faint)", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected.name}</div>
              </div>

              {/* fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 5 }}>Lot</div>
                  <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500 }}>{selected.lot ?? "—"}</div>
                </div>
                <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 5 }}>Date</div>
                  <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "monospace" }}>{selected.date ?? "—"}</div>
                </div>
                <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-accent)", borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 5 }}>Montant HT extrait</div>
                  <div style={{ fontSize: 22, color: "var(--nm-text-primary)", fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em" }}>{fmt(selected.montantHT)}</div>
                </div>
                <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-accent)", borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 5 }}>Montant TTC extrait</div>
                  <div style={{ fontSize: 22, color: "var(--nm-text-primary)", fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em" }}>{fmt(selected.montantTTC)}</div>
                </div>
              </div>

              {/* preview lignes */}
              {selected.lignes && selected.lignes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace", marginBottom: 10 }}>Aperçu lignes</div>
                  <div style={{ border: "1px solid var(--nm-base-raised)", borderRadius: 8, overflow: "hidden" }}>
                    {selected.lignes.slice(0, 3).map((l, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 12px", borderBottom: "1px solid var(--nm-base)" }}>
                        <div style={{ fontSize: 12, color: "var(--nm-text-tertiary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{l.designation}</div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--nm-text-muted)", flexShrink: 0 }}>{fmt(l.total)}</div>
                      </div>
                    ))}
                    {selected.lignes.length > 3 && (
                      <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--nm-text-faint)", fontStyle: "italic" }}>+{selected.lignes.length - 3} ligne(s) masquée(s)…</div>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.status === "extracted" ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginBottom: 4 }}>Document enregistré en base — consultez-le pour valider les lignes.</div>
                    <Link
                      href={selected.docType === "DEVIS" ? `/devis/${selected.devisId}` : "/factures"}
                      style={{ display: "block", width: "100%", padding: 12, background: "var(--nm-accent)", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none" }}
                    >
                      Voir le {selected.docType === "DEVIS" ? "devis" : "la facture"} →
                    </Link>
                    <button
                      onClick={() => { const sid = selected.id; setQueue((q) => q.map((e) => e.id === sid ? { ...e, status: "saved" as const } : e)); }}
                      style={{ width: "100%", padding: 10, background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 8, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Marquer comme traité
                    </button>
                  </>
                ) : (
                  <div style={{ padding: "10px 14px", background: "var(--nm-success-bg)", border: "1px solid var(--nm-success-bg)", borderRadius: 8, fontSize: 13, color: "var(--nm-success)" }}>✓ Traité</div>
                )}
                <button
                  onClick={() => setConfirmReject(selected)}
                  disabled={rejecting === selected.id}
                  style={{ width: "100%", padding: 10, background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 8, color: "var(--nm-danger)", fontSize: 13, cursor: rejecting === selected.id ? "not-allowed" : "pointer", opacity: rejecting === selected.id ? 0.6 : 1, fontFamily: "inherit", marginTop: 4 }}
                >
                  {rejecting === selected.id ? "Suppression…" : "Refuser — infos incorrectes (supprime en base)"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: "100%", minHeight: "calc(100vh - 52px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6m-6 4h6M9 8h1M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="var(--nm-text-faint)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, color: "var(--nm-text-muted)", fontWeight: 500 }}>
                {selected?.status === "processing" ? "Analyse en cours…" : "Sélectionnez un fichier extrait"}
              </div>
              <div style={{ fontSize: 12, color: "var(--nm-text-faint)", maxWidth: 200, lineHeight: 1.7 }}>
                {selected?.status === "processing"
                  ? "Les données apparaîtront ici une fois l'extraction terminée."
                  : "Cliquez sur un fichier dans la file pour voir les données extraites"}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {confirmReject && (
        <Modal onClose={() => setConfirmReject(null)} width={380} titleId="import-reject-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="import-reject-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer ce document ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 22, lineHeight: 1.5 }}>
              {confirmReject.name} sera définitivement supprimé de la base. Cette action est irréversible.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmReject(null)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button
                onClick={() => { const entry = confirmReject; setConfirmReject(null); rejectEntry(entry); }}
                style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
