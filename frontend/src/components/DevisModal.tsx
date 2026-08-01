"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { formatDate, formatEur } from "@/lib/format";
import { statutBg, statutColor, statutLabel } from "@/lib/status";
import { DevisDto, EntrepriseDto, LignePosteDto, TYPE_LOT_LABELS, TYPE_LOT_VALUES, TypeLot } from "@/lib/types";
import { EchangesLlm } from "@/components/EchangesLlm";
import { EntrepriseCombobox } from "@/components/EntrepriseCombobox";
import { useIsMobile } from "@/lib/useMediaQuery";

export { statutLabel, statutBg, statutColor };

export function DevisModal({ devis: initialDevis, onClose, onDeleted, onUpdated }: { devis: DevisDto; onClose: () => void; onDeleted: (id: number) => void; onUpdated: (devis: DevisDto) => void }) {
  const [devis, setDevis] = useState(initialDevis);
  const [editMode, setEditMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ligneEnCours, setLigneEnCours] = useState<LignePosteDto | "new" | null>(null);
  const [confirmDeleteLigne, setConfirmDeleteLigne] = useState<LignePosteDto | null>(null);
  const [confirmDeleteAllLignes, setConfirmDeleteAllLignes] = useState(false);

  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [numeroDevis, setNumeroDevis] = useState(devis.numeroDevis ?? "");
  const [lot, setLot] = useState(devis.lot ?? "");
  const [typeLot, setTypeLot] = useState<TypeLot | "">(devis.typeLot ?? "");
  const [dateDevis, setDateDevis] = useState(devis.dateDevis ?? "");
  const [tvaTaux, setTvaTaux] = useState(devis.tvaTaux?.toString() ?? "");
  const [totalHt, setTotalHt] = useState(devis.totalHt?.toString() ?? "");
  const [totalTtc, setTotalTtc] = useState(devis.totalTtc?.toString() ?? "");
  const [entreprise, setEntreprise] = useState<{ entrepriseId?: number; entrepriseNom?: string }>({ entrepriseId: devis.entreprise?.id });
  const [saving, setSaving] = useState(false);
  const [showPdf, setShowPdf] = useState(devis.hasPdf);
  const [pdfWide, setPdfWide] = useState(false);
  const [showEchanges, setShowEchanges] = useState(false);
  const loadEchanges = useCallback(() => api.devis.echanges(devis.id), [devis.id]);
  const isMobile = useIsMobile();
  // en mobile le split horizontal ne tient pas : les 3 vues deviennent des onglets
  const [tab, setTab] = useState<"details" | "pdf" | "echanges">("details");
  const showPdfPane = !isMobile && showPdf && devis.hasPdf;

  useEffect(() => {
    if (editMode) api.entreprises.list().then(setEntreprises).catch(() => {});
  }, [editMode]);

  useEffect(() => {
    setNumeroDevis(devis.numeroDevis ?? "");
    setLot(devis.lot ?? "");
    setTypeLot(devis.typeLot ?? "");
    setDateDevis(devis.dateDevis ?? "");
    setTvaTaux(devis.tvaTaux?.toString() ?? "");
    setTotalHt(devis.totalHt?.toString() ?? "");
    setTotalTtc(devis.totalTtc?.toString() ?? "");
    setEntreprise({ entrepriseId: devis.entreprise?.id });
  }, [devis]);

  function applyUpdate(updated: DevisDto) {
    setDevis(updated);
    onUpdated(updated);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.devis.update(devis.id, {
        numeroDevis: numeroDevis || undefined,
        lot: lot || undefined,
        typeLot: typeLot || undefined,
        dateDevis: dateDevis || undefined,
        ...entreprise,
        tvaTaux: tvaTaux ? Number(tvaTaux) : undefined,
        totalHt: totalHt ? Number(totalHt) : undefined,
        totalTtc: totalTtc ? Number(totalTtc) : undefined,
      });
      applyUpdate(updated);
      setEditMode(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await api.devis.delete(devis.id);
    onDeleted(devis.id);
  }

  async function handleSaveLigne(dto: { ordre: number; description: string; quantite?: number; unite?: string; prixUnitaire?: number; totalLigne?: number }) {
    const updated = ligneEnCours === "new"
      ? await api.devis.addLigne(devis.id, dto)
      : await api.devis.updateLigne(devis.id, (ligneEnCours as LignePosteDto).id, dto);
    applyUpdate(updated);
    setLigneEnCours(null);
  }

  async function handleDeleteLigne(ligne: LignePosteDto) {
    const updated = await api.devis.deleteLigne(devis.id, ligne.id);
    applyUpdate(updated);
    setConfirmDeleteLigne(null);
  }

  async function handleDeleteAllLignes() {
    const updated = await api.devis.deleteAllLignes(devis.id);
    applyUpdate(updated);
    setConfirmDeleteAllLignes(false);
  }

  const [recalculating, setRecalculating] = useState(false);
  async function handleRecalculer() {
    setRecalculating(true);
    try {
      const updated = await api.devis.recalculer(devis.id);
      applyUpdate(updated);
      setTotalHt(updated.totalHt?.toString() ?? "");
      setTotalTtc(updated.totalTtc?.toString() ?? "");
    } finally {
      setRecalculating(false);
    }
  }

  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const onDropPdf = useCallback(async (accepted: File[]) => {
    if (accepted.length === 0) return;
    setAttachError(null);
    setAttaching(true);
    try {
      const updated = await api.devis.attachPdf(devis.id, accepted[0]);
      applyUpdate(updated);
      setShowPdf(true);
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "Erreur lors de l'ajout du document.");
    } finally {
      setAttaching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis.id]);
  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
    onDrop: onDropPdf,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: attaching,
  });

  const s = devis.statut;

  return (
    <>
      <Modal onClose={onClose} width={isMobile ? 900 : showPdf ? (pdfWide ? 2400 : 1420) : 900} height={isMobile ? undefined : 840} titleId="devis-modal-title">
          {/* header */}
          <div style={{ padding: "clamp(14px, 3vw, 20px) clamp(16px, 4vw, 28px)", borderBottom: "1px solid var(--nm-border)", display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 14px)", flexShrink: 0, background: "var(--nm-base-raised)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)", marginBottom: 5 }}>{devis.numeroDevis ?? "—"}</div>
              <div id="devis-modal-title" style={{ fontSize: "clamp(15px, 4vw, 18px)", fontWeight: 700, color: "var(--nm-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{devis.entreprise?.nom ?? "—"}</div>
            </div>
            <button className="hide-mobile" onClick={() => setShowEchanges((v) => !v)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: showEchanges ? "var(--nm-warning-bg)" : "var(--nm-base-sunken)", color: showEchanges ? "var(--nm-warning)" : "var(--nm-text-muted)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              {showEchanges ? "← Détails" : "Échanges LLM"}
            </button>
            {devis.hasPdf && (
              <button className="hide-mobile" onClick={() => setShowPdf((v) => !v)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: "var(--nm-info-bg)", color: "var(--nm-info)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                {showPdf ? "Masquer le PDF" : "Voir le PDF"}
              </button>
            )}
            {devis.hasPdf && showPdf && (
              <button className="hide-mobile" onClick={() => setPdfWide((v) => !v)} title={pdfWide ? "Réduire l'aperçu" : "Agrandir l'aperçu"} aria-label={pdfWide ? "Réduire l'aperçu du PDF" : "Agrandir l'aperçu du PDF"} style={{ width: 32, height: 32, background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {pdfWide ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" stroke="var(--nm-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="var(--nm-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            )}
            <span className="hide-mobile" style={{ padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "monospace", background: statutBg(s), color: statutColor(s) }}>{statutLabel(s)}</span>
            <button onClick={onClose} aria-label="Fermer" className="touch-target" style={{ width: 32, height: 32, background: "var(--nm-base-raised)", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="var(--nm-text-muted)" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* onglets — mobile uniquement */}
          <div className="show-mobile" style={{ display: "flex", gap: 4, padding: "8px clamp(16px, 4vw, 28px) 0", borderBottom: "1px solid var(--nm-border)", flexShrink: 0, background: "var(--nm-base-raised)" }}>
            {([
              ["details", "Détails"],
              ...(devis.hasPdf ? [["pdf", "PDF"] as const] : []),
              ["echanges", "Échanges"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-current={tab === key ? "page" : undefined}
                style={{ flex: 1, minHeight: 42, padding: "0 10px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === key ? "var(--nm-accent)" : "transparent"}`, color: tab === key ? "var(--nm-accent)" : "var(--nm-text-muted)", fontSize: 13, fontWeight: tab === key ? 600 : 400, fontFamily: "inherit", cursor: "pointer" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* split: contenu à gauche, PDF à droite */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

          {/* body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "clamp(18px, 4vw, 28px) clamp(16px, 4vw, 28px) 8px" }}>
            {isMobile && tab === "pdf" && devis.hasPdf ? (
              <iframe src={api.devis.pdfUrl(devis.id)} title="PDF du devis" style={{ width: "100%", height: "100%", minHeight: "60vh", border: "none", borderRadius: 8, background: "var(--nm-base-sunken)" }} />
            ) : (isMobile ? tab === "echanges" : showEchanges) ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace", marginBottom: 12 }}>Échanges avec le LLM</div>
                <EchangesLlm load={loadEchanges} />
              </div>
            ) : !editMode ? (
              <>
                {/* meta grid */}
                <div className="stack-mobile-2" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
                  {[
                    { label: "Entreprise", value: devis.entreprise?.nom ?? "—" },
                    { label: "Référence", value: devis.numeroDevis ?? "—", mono: true },
                    { label: "Lot", value: devis.lot ?? "—" },
                    { label: "Type", value: devis.typeLot ? TYPE_LOT_LABELS[devis.typeLot] : "—" },
                  ].map(({ label, value, mono }) => (
                    <div key={label} style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="stack-mobile-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
                  {[
                    { label: "Date", value: formatDate(devis.dateDevis) },
                    { label: "Validité", value: formatDate(devis.dateValidite) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, fontFamily: "monospace" }}>{value}</div>
                    </div>
                  ))}
                  <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-accent)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Montant HT</div>
                    <div style={{ fontSize: 16, color: "var(--nm-text-primary)", fontWeight: 700, fontFamily: "monospace" }}>{formatEur(devis.totalHt)}</div>
                  </div>
                  <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-accent)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Montant TTC</div>
                    <div style={{ fontSize: 16, color: "var(--nm-text-primary)", fontWeight: 700, fontFamily: "monospace" }}>{formatEur(devis.totalTtc)}</div>
                    <div style={{ fontSize: 9, color: "var(--nm-text-faint)", fontFamily: "monospace", marginTop: 3 }}>TVA {devis.tvaTaux ?? 20}% incl.</div>
                  </div>
                </div>

                {/* lignes */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace", marginBottom: 12 }}>Lignes du devis</div>
                  <div className="table-to-cards" style={{ border: "1px solid var(--nm-border)", borderRadius: 8, overflow: "hidden" }}>
                    <div className="tc-head" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px", padding: "0 16px", background: "var(--nm-base-sunken)", borderBottom: "1px solid var(--nm-border)" }}>
                      {["Réf.", "Désignation", "Qté", "Unité", "P.U. HT", "Total HT"].map((h, i) => (
                        <div key={h} style={{ padding: "9px 8px", fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", textAlign: i >= 4 ? "right" : i === 2 ? "right" : undefined }}>{h}</div>
                      ))}
                    </div>
                    {devis.lignes.map((l) => (
                      <div key={l.id} className="tc-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px", padding: "0 16px", borderBottom: "1px solid var(--nm-base)" }}>
                        <div data-label="Réf." style={{ padding: "11px 8px", fontSize: 11, fontFamily: "monospace", color: "var(--nm-text-faint)" }}>{l.ordre}</div>
                        <div data-label="Désignation" style={{ padding: "11px 8px", fontSize: 12, color: "var(--nm-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</div>
                        <div data-label="Qté" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{l.quantite ?? "—"}</div>
                        <div data-label="Unité" style={{ padding: "11px 8px", fontSize: 12, color: "var(--nm-text-muted)" }}>{l.unite ?? "—"}</div>
                        <div data-label="P.U. HT" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{formatEur(l.prixUnitaire)}</div>
                        <div data-label="Total HT" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-secondary)", textAlign: "right", fontWeight: 500 }}>{formatEur(l.totalLigne)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: "var(--nm-success-bg)", border: "1px solid var(--nm-success)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--nm-success)", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="var(--nm-success)" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--nm-success)" strokeWidth="2" strokeLinecap="round"/></svg>
                  Mode édition — les modifications seront enregistrées en base PostgreSQL
                </div>
                {!devis.hasPdf && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace", marginBottom: 12 }}>Document</div>
                    <div {...getPdfRootProps()} style={{ border: `2px dashed ${isPdfDragActive ? "var(--nm-accent)" : "var(--nm-border-strong)"}`, borderRadius: 10, background: isPdfDragActive ? "rgba(249,115,22,0.06)" : "var(--nm-base-raised)", padding: "24px", textAlign: "center", cursor: attaching ? "not-allowed" : "pointer", opacity: attaching ? 0.6 : 1 }}>
                      <input {...getPdfInputProps()} />
                      <div style={{ fontSize: 13, color: "var(--nm-text-tertiary)", fontWeight: 500 }}>
                        {attaching ? "Ajout en cours…" : isPdfDragActive ? "Déposez le PDF ici" : "Ajouter un document PDF"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--nm-text-faint)", marginTop: 4 }}>Glissez-déposez ou cliquez — le fichier sera rattaché à ce devis</div>
                    </div>
                    {attachError && <div style={{ marginTop: 8, fontSize: 12, color: "var(--nm-danger)" }}>{attachError}</div>}
                  </div>
                )}
                <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label htmlFor="devis-edit-numero" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Référence</label>
                    <input id="devis-edit-numero" value={numeroDevis} onChange={(e) => setNumeroDevis(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="devis-edit-entreprise" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Entreprise</label>
                    <EntrepriseCombobox id="devis-edit-entreprise" entreprises={entreprises} entrepriseId={entreprise.entrepriseId} entrepriseNom={entreprise.entrepriseNom} onChange={setEntreprise} />
                  </div>
                  <div>
                    <label htmlFor="devis-edit-lot" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Lot</label>
                    <input id="devis-edit-lot" value={lot} onChange={(e) => setLot(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="devis-edit-type" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Type</label>
                    <select id="devis-edit-type" value={typeLot} onChange={(e) => setTypeLot(e.target.value as TypeLot | "")} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}>
                      <option value="">—</option>
                      {TYPE_LOT_VALUES.map((t) => (
                        <option key={t} value={t}>{TYPE_LOT_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="devis-edit-date" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Date</label>
                    <input id="devis-edit-date" type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="devis-edit-tva" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>TVA (%)</label>
                    <input id="devis-edit-tva" value={tvaTaux} onChange={(e) => setTvaTaux(e.target.value)} inputMode="decimal" placeholder="20" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="devis-edit-totalht" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Total HT</label>
                    <input id="devis-edit-totalht" value={totalHt} onChange={(e) => setTotalHt(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="devis-edit-totalttc" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Total TTC</label>
                    <input id="devis-edit-totalttc" value={totalTtc} onChange={(e) => setTotalTtc(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace" }}>Lignes du devis</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {devis.lignes.length > 0 && (
                        <button onClick={handleRecalculer} disabled={recalculating} title="Remplace HT/TTC par la somme des lignes" style={{ padding: "6px 12px", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 6, color: "var(--nm-text-secondary)", fontSize: 12, cursor: recalculating ? "not-allowed" : "pointer", opacity: recalculating ? 0.6 : 1, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="var(--nm-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {recalculating ? "Recalcul…" : "Recalculer le total depuis les lignes"}
                        </button>
                      )}
                      {devis.lignes.length > 0 && (
                        <button onClick={() => setConfirmDeleteAllLignes(true)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 6, color: "var(--nm-danger)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="var(--nm-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Tout supprimer
                        </button>
                      )}
                      <button onClick={() => setLigneEnCours("new")} style={{ padding: "6px 12px", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 6, color: "var(--nm-text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="var(--nm-text-secondary)" strokeWidth="2" strokeLinecap="round"/></svg>
                        Ajouter une ligne
                      </button>
                    </div>
                  </div>
                  <div className="table-to-cards" style={{ border: "1px solid var(--nm-border)", borderRadius: 8, overflow: "hidden" }}>
                    <div className="tc-head" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px 96px 76px", padding: "0 16px", background: "var(--nm-base-sunken)", borderBottom: "1px solid var(--nm-border)" }}>
                      {["Réf.", "Désignation", "Qté", "Unité", "P.U. HT", "Total HT", "Total TTC", ""].map((h, i) => (
                        <div key={h || i} style={{ padding: "9px 8px", fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", textAlign: i >= 4 && i <= 6 ? "right" : i === 2 ? "right" : undefined }}>{h}</div>
                      ))}
                    </div>
                    {devis.lignes.map((l) => (
                      <div key={l.id} className="tc-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px 96px 76px", padding: "0 16px", borderBottom: "1px solid var(--nm-base)" }}>
                        <div data-label="Réf." style={{ padding: "11px 8px", fontSize: 11, fontFamily: "monospace", color: "var(--nm-text-faint)" }}>{l.ordre}</div>
                        <div data-label="Désignation" style={{ padding: "11px 8px", fontSize: 12, color: "var(--nm-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</div>
                        <div data-label="Qté" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{l.quantite ?? "—"}</div>
                        <div data-label="Unité" style={{ padding: "11px 8px", fontSize: 12, color: "var(--nm-text-muted)" }}>{l.unite ?? "—"}</div>
                        <div data-label="P.U. HT" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{formatEur(l.prixUnitaire)}</div>
                        <div data-label="Total HT" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-secondary)", textAlign: "right", fontWeight: 500 }}>{formatEur(l.totalLigne)}</div>
                        <div data-label="Total TTC" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{l.totalLigne != null ? formatEur(l.totalLigne * (1 + (devis.tvaTaux ?? 20) / 100)) : "—"}</div>
                        <div data-label="" style={{ padding: "9px 8px", display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button onClick={() => setLigneEnCours(l)} title="Modifier" aria-label="Modifier la ligne" className="touch-target" style={{ width: 24, height: 24, background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="var(--nm-text-tertiary)" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--nm-text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <button onClick={() => setConfirmDeleteLigne(l)} title="Supprimer" aria-label="Supprimer la ligne" className="touch-target" style={{ width: 24, height: 24, background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="var(--nm-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {devis.lignes.length === 0 && (
                      <div style={{ padding: "20px 16px", fontSize: 12, color: "var(--nm-text-faint)", textAlign: "center" }}>Aucune ligne. Ajoutez-en une.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* footer */}
          <div style={{ padding: "16px clamp(16px, 4vw, 28px)", borderTop: "1px solid var(--nm-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0, background: "var(--nm-base-raised)" }}>
            {!editMode ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditMode(true)} style={{ padding: "9px 20px", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="var(--nm-text-tertiary)" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--nm-text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
                  Modifier
                </button>
                <button onClick={() => setConfirmDelete(true)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 7, color: "var(--nm-danger)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="var(--nm-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Supprimer
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditMode(false)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                <button onClick={save} disabled={saving} style={{ padding: "9px 20px", background: "var(--nm-success)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}
            <button onClick={onClose} style={{ padding: "9px 20px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>
          </div>

          </div>{/* fin colonne gauche */}

          {/* pane PDF — desktop uniquement, en mobile c'est l'onglet « PDF » */}
          {showPdfPane && (
            <div style={{ width: pdfWide ? "min(1900px, 90vw)" : 500, flexShrink: 0, borderLeft: "1px solid var(--nm-border)", background: "var(--nm-base-sunken)" }}>
              <iframe src={api.devis.pdfUrl(devis.id)} title="PDF du devis" style={{ width: "100%", height: "100%", border: "none" }} />
            </div>
          )}
          </div>{/* fin split */}
      </Modal>

      {/* delete confirmation */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} width={380} titleId="devis-delete-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="devis-delete-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer ce devis ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 22, lineHeight: 1.5 }}>
              Le devis de {devis.entreprise?.nom ?? "cette entreprise"} sera définitivement supprimé. Cette action est irréversible.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => { setConfirmDelete(false); handleDelete(); }} style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* delete all lignes confirmation */}
      {confirmDeleteAllLignes && (
        <Modal onClose={() => setConfirmDeleteAllLignes(false)} width={380} titleId="devis-delete-all-lignes-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="devis-delete-all-lignes-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer toutes les lignes ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 22, lineHeight: 1.5 }}>
              Les {devis.lignes.length} ligne(s) de ce devis seront définitivement supprimées. Cette action est irréversible.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDeleteAllLignes(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleDeleteAllLignes} style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Tout supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ligne form */}
      {ligneEnCours !== null && (
        <LigneForm
          ligne={ligneEnCours === "new" ? null : ligneEnCours}
          nextOrdre={devis.lignes.length + 1}
          onCancel={() => setLigneEnCours(null)}
          onSave={handleSaveLigne}
        />
      )}

      {/* ligne delete confirmation */}
      {confirmDeleteLigne && (
        <Modal onClose={() => setConfirmDeleteLigne(null)} width={380} titleId="devis-delete-ligne-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="devis-delete-ligne-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer cette ligne ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 22, lineHeight: 1.5 }}>
              La ligne « {confirmDeleteLigne.description} » sera définitivement supprimée.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDeleteLigne(null)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => handleDeleteLigne(confirmDeleteLigne)} style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* toast */}
      <div style={{ position: "fixed", bottom: isMobile ? 80 : 24, left: "50%", transform: `translateX(-50%) translateY(${showToast ? "0px" : "10px"})`, zIndex: 100, background: "var(--nm-success-bg)", border: "1px solid var(--nm-success)", borderRadius: 9, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, opacity: showToast ? 1 : 0, pointerEvents: "none", transition: "opacity 0.3s ease, transform 0.3s ease", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--nm-success)" strokeWidth="2.5" strokeLinecap="round"/></svg>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--nm-success)" }}>Modifications enregistrées en base</span>
      </div>
    </>
  );
}

export function LigneForm({ ligne, nextOrdre, onCancel, onSave }: {
  ligne: LignePosteDto | null;
  nextOrdre: number;
  onCancel: () => void;
  onSave: (dto: { ordre: number; description: string; quantite?: number; unite?: string; prixUnitaire?: number; totalLigne?: number }) => Promise<void>;
}) {
  const [description, setDescription] = useState(ligne?.description ?? "");
  const [quantite, setQuantite] = useState(ligne?.quantite?.toString() ?? "");
  const [unite, setUnite] = useState(ligne?.unite ?? "");
  const [prixUnitaire, setPrixUnitaire] = useState(ligne?.prixUnitaire?.toString() ?? "");
  const [totalLigne, setTotalLigne] = useState(ligne?.totalLigne?.toString() ?? "");
  const [totalTtc, setTotalTtc] = useState(ligne?.totalLigne != null ? (ligne.totalLigne * 1.2).toFixed(2) : "");
  const [saving, setSaving] = useState(false);

  const TVA_TAUX = 0.2;
  // tolère "1 200,50", "1200.5", espaces insécables et fines (copier-coller depuis un PDF/Excel FR)
  const num = (v: string) => {
    if (!v) return null;
    const cleaned = v.replace(/[\s  ]/g, "").replace(",", ".");
    const n = Number(cleaned);
    return cleaned && !isNaN(n) ? n : null;
  };
  const fmt = (n: number) => n.toFixed(2);

  // P.U. fixe, Qté pilote : Total HT = Qté × P.U., TTC = HT × 1.2
  function recalcFromQtePu(q: string, pu: string) {
    const nq = num(q), npu = num(pu);
    if (nq != null && npu != null) {
      const ht = nq * npu;
      setTotalLigne(fmt(ht));
      setTotalTtc(fmt(ht * (1 + TVA_TAUX)));
    }
  }

  function handleQuantiteChange(v: string) {
    setQuantite(v);
    recalcFromQtePu(v, prixUnitaire);
  }

  function handlePuChange(v: string) {
    setPrixUnitaire(v);
    recalcFromQtePu(quantite, v);
  }

  function handleHtChange(v: string) {
    setTotalLigne(v);
    const ht = num(v), nq = num(quantite);
    if (ht != null) {
      setTotalTtc(fmt(ht * (1 + TVA_TAUX)));
      if (nq) setPrixUnitaire(fmt(ht / nq));
    }
  }

  function handleTtcChange(v: string) {
    setTotalTtc(v);
    const ttc = num(v), nq = num(quantite);
    if (ttc != null) {
      const ht = ttc / (1 + TVA_TAUX);
      setTotalLigne(fmt(ht));
      if (nq) setPrixUnitaire(fmt(ht / nq));
    }
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSave({
        ordre: ligne?.ordre ?? nextOrdre,
        description,
        quantite: num(quantite) ?? undefined,
        unite: unite || undefined,
        prixUnitaire: num(prixUnitaire) ?? undefined,
        totalLigne: num(totalLigne) ?? undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onCancel} width={460} titleId="ligne-form-title">
      <div style={{ padding: "24px 24px 20px" }}>
        <div id="ligne-form-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 18 }}>{ligne ? "Modifier la ligne" : "Ajouter une ligne"}</div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="ligne-form-description" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Désignation</label>
          <input id="ligne-form-description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
        </div>
        <div className="stack-mobile-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div>
            <label htmlFor="ligne-form-qte" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Qté</label>
            <input id="ligne-form-qte" value={quantite} onChange={(e) => handleQuantiteChange(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 10px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
          </div>
          <div>
            <label htmlFor="ligne-form-unite" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Unité</label>
            <input id="ligne-form-unite" value={unite} onChange={(e) => setUnite(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 10px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
          </div>
          <div>
            <label htmlFor="ligne-form-pu" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>P.U. HT</label>
            <input id="ligne-form-pu" value={prixUnitaire} onChange={(e) => handlePuChange(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 10px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
          </div>
          <div>
            <label htmlFor="ligne-form-totalht" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Total HT</label>
            <input id="ligne-form-totalht" value={totalLigne} onChange={(e) => handleHtChange(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 10px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
          </div>
          <div>
            <label htmlFor="ligne-form-totalttc" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Total TTC</label>
            <input id="ligne-form-totalttc" value={totalTtc} onChange={(e) => handleTtcChange(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 10px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving || !description} style={{ padding: "9px 18px", background: "var(--nm-success)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: saving || !description ? "not-allowed" : "pointer", opacity: saving || !description ? 0.6 : 1, fontFamily: "inherit" }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
