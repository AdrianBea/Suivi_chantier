"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LigneForm, statutBg, statutColor, statutLabel } from "@/components/DevisModal";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { formatDate, formatEur, formatTaille } from "@/lib/format";
import { EntrepriseDto, FactureDto, LigneFactureDto, PieceJointeDto, TYPE_LOT_LABELS, TYPE_LOT_VALUES, TypeLot } from "@/lib/types";
import { EntrepriseCombobox } from "@/components/EntrepriseCombobox";
import { formatMontant, TVA_DEFAUT, useCalculTva } from "@/lib/montants";
import { PieceJointeUploadForm } from "@/components/PieceJointeUploadForm";
import { useIsMobile } from "@/lib/useMediaQuery";

export function FactureModal({ facture: initialFacture, onClose, onDeleted, onUpdated }: { facture: FactureDto; onClose: () => void; onDeleted: (id: number) => void; onUpdated: (facture: FactureDto) => void }) {
  const [facture, setFacture] = useState(initialFacture);
  const [editMode, setEditMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ligneEnCours, setLigneEnCours] = useState<LigneFactureDto | "new" | null>(null);
  const [confirmDeleteLigne, setConfirmDeleteLigne] = useState<LigneFactureDto | null>(null);
  const [confirmDeletePj, setConfirmDeletePj] = useState<PieceJointeDto | null>(null);
  const [pjError, setPjError] = useState<string | null>(null);

  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [entreprise, setEntreprise] = useState<{ entrepriseId?: number; entrepriseNom?: string }>({ entrepriseId: facture.entreprise?.id });
  const [numeroFacture, setNumeroFacture] = useState(facture.numeroFacture ?? "");
  const [typeLot, setTypeLot] = useState<TypeLot | "">(facture.typeLot ?? "");
  const [dateFacture, setDateFacture] = useState(facture.dateFacture ?? "");
  const [dateEcheance, setDateEcheance] = useState(facture.dateEcheance ?? "");
  // calcul en croix HT / TVA / TTC de l'entête, identique à celui de la modale de ligne
  const totaux = useCalculTva(facture);
  const [saving, setSaving] = useState(false);
  const [showPdf, setShowPdf] = useState(facture.hasPdf);
  const [pdfWide, setPdfWide] = useState(false);
  const isMobile = useIsMobile();
  // en mobile le split horizontal ne tient pas : Détails / PDF deviennent des onglets
  const [tab, setTab] = useState<"details" | "pdf">("details");
  const showPdfPane = !isMobile && showPdf && facture.hasPdf;

  useEffect(() => {
    if (editMode) api.entreprises.list().then(setEntreprises).catch(() => {});
  }, [editMode]);

  useEffect(() => {
    setEntreprise({ entrepriseId: facture.entreprise?.id });
    setNumeroFacture(facture.numeroFacture ?? "");
    setTypeLot(facture.typeLot ?? "");
    setDateFacture(facture.dateFacture ?? "");
    setDateEcheance(facture.dateEcheance ?? "");
    totaux.reset(facture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facture]);

  function applyUpdate(updated: FactureDto) {
    setFacture(updated);
    onUpdated(updated);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.factures.update(facture.id, {
        ...entreprise,
        numeroFacture: numeroFacture || undefined,
        typeLot: typeLot || undefined,
        dateFacture: dateFacture || undefined,
        dateEcheance: dateEcheance || undefined,
        ...totaux.values,
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
    await api.factures.delete(facture.id);
    onDeleted(facture.id);
  }

  async function handleSaveLigne(dto: { ordre: number; description: string; quantite?: number; unite?: string; prixUnitaire?: number; totalLigne?: number }) {
    const updated = ligneEnCours === "new"
      ? await api.factures.addLigne(facture.id, dto)
      : await api.factures.updateLigne(facture.id, (ligneEnCours as LigneFactureDto).id, dto);
    applyUpdate(updated);
    setLigneEnCours(null);
  }

  async function handleDeleteLigne(ligne: LigneFactureDto) {
    const updated = await api.factures.deleteLigne(facture.id, ligne.id);
    applyUpdate(updated);
    setConfirmDeleteLigne(null);
  }

  async function handleUploadPj(file: File, libelle?: string) {
    setPjError(null);
    try {
      await api.factures.uploadPieceJointe(facture.id, file, libelle);
      const updated = await api.factures.getById(facture.id);
      applyUpdate(updated);
    } catch (e) {
      setPjError(e instanceof Error ? e.message : "Erreur lors de l'import.");
      throw e;
    }
  }

  async function handleDeletePj(piece: PieceJointeDto) {
    setPjError(null);
    try {
      await api.factures.deletePieceJointe(facture.id, piece.id);
      const updated = await api.factures.getById(facture.id);
      applyUpdate(updated);
    } catch (e) {
      setPjError(e instanceof Error ? e.message : "Erreur lors de la suppression.");
    } finally {
      setConfirmDeletePj(null);
    }
  }

  const s = facture.statut;

  return (
    <>
      <Modal onClose={onClose} width={isMobile ? 900 : showPdf ? (pdfWide ? 2400 : 1420) : 900} titleId="facture-modal-title">
          {/* header */}
          <div style={{ padding: "clamp(14px, 3vw, 20px) clamp(16px, 4vw, 28px)", borderBottom: "1px solid var(--nm-border)", display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 14px)", flexShrink: 0, background: "var(--nm-base-raised)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)", marginBottom: 5 }}>{facture.numeroFacture ?? "—"}</div>
              <div id="facture-modal-title" style={{ fontSize: "clamp(15px, 4vw, 18px)", fontWeight: 700, color: "var(--nm-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{facture.entreprise?.nom ?? "—"}</div>
            </div>
            {facture.devisId && (
              <Link href={`/factures/${facture.id}/comparaison`} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: "var(--nm-accent-soft-bg)", color: "var(--nm-accent-hover)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                Voir les écarts
              </Link>
            )}
            {facture.hasPdf && (
              <button className="hide-mobile" onClick={() => setShowPdf((v) => !v)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: "var(--nm-info-bg)", color: "var(--nm-info)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                {showPdf ? "Masquer le PDF" : "Voir le PDF"}
              </button>
            )}
            {facture.hasPdf && showPdf && (
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
          {facture.hasPdf && (
            <div className="show-mobile" style={{ display: "flex", gap: 4, padding: "8px clamp(16px, 4vw, 28px) 0", borderBottom: "1px solid var(--nm-border)", flexShrink: 0, background: "var(--nm-base-raised)" }}>
              {([["details", "Détails"], ["pdf", "PDF"]] as const).map(([key, label]) => (
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
          )}

          {/* split: contenu à gauche, PDF à droite */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

          {/* body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "clamp(18px, 4vw, 28px) clamp(16px, 4vw, 28px) 8px" }}>
            {isMobile && tab === "pdf" && facture.hasPdf ? (
              <iframe src={api.factures.pdfUrl(facture.id)} title="PDF de la facture" sandbox="allow-same-origin" style={{ width: "100%", height: "100%", minHeight: "60vh", border: "none", borderRadius: 8, background: "var(--nm-base-sunken)" }} />
            ) : !editMode ? (
              <>
                {/* meta grid */}
                <div className="stack-mobile-2" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
                  {[
                    { label: "Entreprise", value: facture.entreprise?.nom ?? "—" },
                    { label: "N° Facture", value: facture.numeroFacture ?? "—", mono: true },
                    { label: "Devis lié", value: facture.devisId ? `#${facture.devisId}` : "Aucun" },
                    { label: "Type", value: facture.typeLot ? TYPE_LOT_LABELS[facture.typeLot] : "—" },
                  ].map(({ label, value, mono }) => (
                    <div key={label} style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="stack-mobile-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
                  {[
                    { label: "Date facture", value: formatDate(facture.dateFacture) },
                    { label: "Échéance", value: formatDate(facture.dateEcheance) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, fontFamily: "monospace" }}>{value}</div>
                    </div>
                  ))}
                  <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-accent)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Montant HT</div>
                    <div style={{ fontSize: 16, color: "var(--nm-text-primary)", fontWeight: 700, fontFamily: "monospace" }}>{formatEur(facture.totalHt)}</div>
                  </div>
                  <div style={{ background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-accent)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Montant TTC</div>
                    <div style={{ fontSize: 16, color: "var(--nm-text-primary)", fontWeight: 700, fontFamily: "monospace" }}>{formatEur(facture.totalTtc)}</div>
                    <div style={{ fontSize: 9, color: "var(--nm-text-faint)", fontFamily: "monospace", marginTop: 3 }}>TVA {facture.tvaTaux ?? TVA_DEFAUT}% incl.</div>
                  </div>
                </div>

                {/* lignes */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace", marginBottom: 12 }}>Lignes de facturation</div>
                  <div className="table-to-cards" style={{ border: "1px solid var(--nm-border)", borderRadius: 8, overflow: "hidden" }}>
                    <div className="tc-head" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px", padding: "0 16px", background: "var(--nm-base-sunken)", borderBottom: "1px solid var(--nm-border)" }}>
                      {["Réf.", "Désignation", "Qté", "Unité", "P.U. HT", "Total HT"].map((h, i) => (
                        <div key={h} style={{ padding: "9px 8px", fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", textAlign: i >= 4 ? "right" : i === 2 ? "right" : undefined }}>{h}</div>
                      ))}
                    </div>
                    {facture.lignes.map((l) => (
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
                  Mode édition — vos modifications seront enregistrées
                </div>
                <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label htmlFor="facture-edit-numero" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>N° Facture</label>
                    <input id="facture-edit-numero" value={numeroFacture} onChange={(e) => setNumeroFacture(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="facture-edit-entreprise" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Entreprise</label>
                    {facture.devisId ? (
                      <>
                        <div style={{ width: "100%", background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-muted)" }}>{facture.entreprise?.nom ?? "—"}</div>
                        <div style={{ fontSize: 10, color: "var(--nm-text-faint)", marginTop: 5 }}>Déliez le devis pour changer l&apos;entreprise</div>
                      </>
                    ) : (
                      <EntrepriseCombobox id="facture-edit-entreprise" entreprises={entreprises} entrepriseId={entreprise.entrepriseId} entrepriseNom={entreprise.entrepriseNom} onChange={setEntreprise} />
                    )}
                  </div>
                  <div>
                    <label htmlFor="facture-edit-type" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Type</label>
                    <select id="facture-edit-type" value={typeLot} onChange={(e) => setTypeLot(e.target.value as TypeLot | "")} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}>
                      <option value="">—</option>
                      {TYPE_LOT_VALUES.map((t) => (
                        <option key={t} value={t}>{TYPE_LOT_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="facture-edit-datefacture" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Date facture</label>
                    <input id="facture-edit-datefacture" type="date" value={dateFacture} onChange={(e) => setDateFacture(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="facture-edit-echeance" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Échéance</label>
                    <input id="facture-edit-echeance" type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="facture-edit-tva" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>TVA (%)</label>
                    <input id="facture-edit-tva" value={totaux.tvaTaux} onChange={(e) => totaux.handleTvaChange(e.target.value)} inputMode="decimal" placeholder={String(TVA_DEFAUT)} style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="facture-edit-totalht" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Total HT</label>
                    <input id="facture-edit-totalht" value={totaux.totalHt} onChange={(e) => totaux.handleHtChange(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div>
                    <label htmlFor="facture-edit-totalttc" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Total TTC</label>
                    <input id="facture-edit-totalttc" value={totaux.totalTtc} onChange={(e) => totaux.handleTtcChange(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}/>
                  </div>
                  <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--nm-text-faint)" }}>
                    Montant de TVA : {totaux.montantTva != null ? `${formatMontant(totaux.montantTva)} €` : "—"} — la saisie d&apos;un des trois champs recalcule les deux autres.
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace" }}>Lignes de facturation</div>
                    <button onClick={() => setLigneEnCours("new")} style={{ padding: "6px 12px", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 6, color: "var(--nm-text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="var(--nm-text-secondary)" strokeWidth="2" strokeLinecap="round"/></svg>
                      Ajouter une ligne
                    </button>
                  </div>
                  <div className="table-to-cards" style={{ border: "1px solid var(--nm-border)", borderRadius: 8, overflow: "hidden" }}>
                    <div className="tc-head" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px 76px", padding: "0 16px", background: "var(--nm-base-sunken)", borderBottom: "1px solid var(--nm-border)" }}>
                      {["Réf.", "Désignation", "Qté", "Unité", "P.U. HT", "Total HT", ""].map((h, i) => (
                        <div key={h || i} style={{ padding: "9px 8px", fontSize: 9, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", textAlign: i >= 4 && i <= 5 ? "right" : i === 2 ? "right" : undefined }}>{h}</div>
                      ))}
                    </div>
                    {facture.lignes.map((l) => (
                      <div key={l.id} className="tc-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 56px 64px 96px 96px 76px", padding: "0 16px", borderBottom: "1px solid var(--nm-base)" }}>
                        <div data-label="Réf." style={{ padding: "11px 8px", fontSize: 11, fontFamily: "monospace", color: "var(--nm-text-faint)" }}>{l.ordre}</div>
                        <div data-label="Désignation" style={{ padding: "11px 8px", fontSize: 12, color: "var(--nm-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</div>
                        <div data-label="Qté" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{l.quantite ?? "—"}</div>
                        <div data-label="Unité" style={{ padding: "11px 8px", fontSize: 12, color: "var(--nm-text-muted)" }}>{l.unite ?? "—"}</div>
                        <div data-label="P.U. HT" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-muted)", textAlign: "right" }}>{formatEur(l.prixUnitaire)}</div>
                        <div data-label="Total HT" style={{ padding: "11px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--nm-text-secondary)", textAlign: "right", fontWeight: 500 }}>{formatEur(l.totalLigne)}</div>
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
                    {facture.lignes.length === 0 && (
                      <div style={{ padding: "20px 16px", fontSize: 12, color: "var(--nm-text-faint)", textAlign: "center" }}>Aucune ligne. Ajoutez-en une.</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* pieces jointes */}
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "monospace", marginBottom: 12 }}>Pièces jointes</div>
              <div style={{ border: "1px solid var(--nm-border)", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
                {facture.piecesJointes.map((pj) => (
                  <div key={pj.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--nm-base)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--nm-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="var(--nm-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={api.factures.pieceJointeUrl(facture.id, pj.id)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--nm-text-secondary)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {pj.nomFichier}
                      </a>
                      {pj.libelle && <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 2 }}>{pj.libelle}</div>}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--nm-text-faint)", whiteSpace: "nowrap" }}>{formatTaille(pj.tailleOctets)}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--nm-text-faint)", whiteSpace: "nowrap" }}>{formatDate(pj.createdAt)}</div>
                    <button onClick={() => setConfirmDeletePj(pj)} title="Supprimer" aria-label={`Supprimer la pièce jointe ${pj.nomFichier}`} style={{ width: 24, height: 24, background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="var(--nm-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                ))}
                {facture.piecesJointes.length === 0 && (
                  <div style={{ padding: "20px 16px", fontSize: 12, color: "var(--nm-text-faint)", textAlign: "center" }}>Aucune pièce jointe.</div>
                )}
              </div>
              <PieceJointeUploadForm onUpload={handleUploadPj} />
              {pjError && <p style={{ marginTop: 8, fontSize: 12, color: "var(--nm-danger)" }}>{pjError}</p>}
            </div>
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
              <iframe src={api.factures.pdfUrl(facture.id)} title="PDF de la facture" sandbox="allow-same-origin" style={{ width: "100%", height: "100%", border: "none" }} />
            </div>
          )}
          </div>{/* fin split */}
      </Modal>

      {/* delete confirmation */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} width={380} titleId="facture-delete-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="facture-delete-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer cette facture ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 22, lineHeight: 1.5 }}>
              La facture de {facture.entreprise?.nom ?? "cette entreprise"} sera définitivement supprimée. Cette action est irréversible.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => { setConfirmDelete(false); handleDelete(); }} style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ligne form */}
      {ligneEnCours !== null && (
        <LigneForm
          ligne={ligneEnCours === "new" ? null : ligneEnCours}
          nextOrdre={facture.lignes.length + 1}
          tvaTaux={totaux.taux}
          onCancel={() => setLigneEnCours(null)}
          onSave={handleSaveLigne}
        />
      )}

      {/* ligne delete confirmation */}
      {confirmDeleteLigne && (
        <Modal onClose={() => setConfirmDeleteLigne(null)} width={380} titleId="facture-delete-ligne-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="facture-delete-ligne-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer cette ligne ?</div>
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

      {/* piece jointe delete confirmation */}
      {confirmDeletePj && (
        <Modal onClose={() => setConfirmDeletePj(null)} width={380} titleId="facture-delete-pj-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="facture-delete-pj-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer cette pièce jointe ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 22, lineHeight: 1.5 }}>
              Le fichier « {confirmDeletePj.nomFichier} » sera définitivement supprimé.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDeletePj(null)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => handleDeletePj(confirmDeletePj)} style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* toast */}
      <div style={{ position: "fixed", bottom: isMobile ? 80 : 24, left: "50%", transform: `translateX(-50%) translateY(${showToast ? "0px" : "10px"})`, zIndex: 100, background: "var(--nm-success-bg)", border: "1px solid var(--nm-success)", borderRadius: 9, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, opacity: showToast ? 1 : 0, pointerEvents: "none", transition: "opacity 0.3s ease, transform 0.3s ease", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--nm-success)" strokeWidth="2.5" strokeLinecap="round"/></svg>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--nm-success)" }}>Modifications enregistrées</span>
      </div>
    </>
  );
}
