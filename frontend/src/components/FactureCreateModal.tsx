"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { DevisDto, EntrepriseDto, FactureDto, TYPE_LOT_LABELS, TYPE_LOT_VALUES, TypeLot } from "@/lib/types";
import { EntrepriseCombobox } from "./EntrepriseCombobox";

export function FactureCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (facture: FactureDto) => void }) {
  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [devis, setDevis] = useState<DevisDto[]>([]);
  const [entreprise, setEntreprise] = useState<{ entrepriseId?: number; entrepriseNom?: string }>({});
  const [devisId, setDevisId] = useState<number | undefined>();
  const [numeroFacture, setNumeroFacture] = useState("");
  const [typeLot, setTypeLot] = useState<TypeLot | "">("");
  const [dateFacture, setDateFacture] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.entreprises.list().then(setEntreprises).catch(() => {});
    api.devis.list().then(setDevis).catch(() => {});
  }, []);

  // pré-sélectionne l'entreprise du devis lié si choisi
  useEffect(() => {
    if (!devisId) return;
    const linked = devis.find((d) => d.id === devisId);
    if (linked?.entreprise) setEntreprise({ entrepriseId: linked.entreprise.id });
    if (linked?.typeLot) setTypeLot(linked.typeLot);
  }, [devisId, devis]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const facture = await api.factures.create({
        ...entreprise,
        devisId,
        numeroFacture: numeroFacture || undefined,
        typeLot: typeLot || undefined,
        dateFacture: dateFacture || undefined,
        dateEcheance: dateEcheance || undefined,
      });
      onCreated(facture);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} width={520} titleId="facture-create-title">
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #2C2C2C", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "#1A1A1A" }}>
          <div id="facture-create-title" style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700, color: "#F0EDE8" }}>Nouvelle facture</div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, background: "#2A2A2A", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#888480" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {error && (
            <div style={{ background: "#2A1616", border: "1px solid #4A2323", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#F87171" }}>{error}</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="facture-create-devis" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Lier à un devis (optionnel)</label>
              <select id="facture-create-devis" value={devisId ?? ""} onChange={(e) => setDevisId(e.target.value ? Number(e.target.value) : undefined)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}>
                <option value="">— Aucun devis —</option>
                {devis.map((d) => (
                  <option key={d.id} value={d.id}>{d.entreprise?.nom ?? `Devis #${d.id}`} {d.lot ? `— ${d.lot}` : ""} ({d.dateDevis ?? "?"})</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="facture-create-entreprise" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Entreprise</label>
              <EntrepriseCombobox id="facture-create-entreprise" entreprises={entreprises} entrepriseId={entreprise.entrepriseId} entrepriseNom={entreprise.entrepriseNom} onChange={setEntreprise} />
            </div>
            <div>
              <label htmlFor="facture-create-numero" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>N° Facture</label>
              <input id="facture-create-numero" value={numeroFacture} onChange={(e) => setNumeroFacture(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
            </div>
            <div>
              <label htmlFor="facture-create-type" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Type</label>
              <select id="facture-create-type" value={typeLot} onChange={(e) => setTypeLot(e.target.value as TypeLot | "")} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}>
                <option value="">—</option>
                {TYPE_LOT_VALUES.map((t) => (
                  <option key={t} value={t}>{TYPE_LOT_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="facture-create-datefacture" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Date facture</label>
              <input id="facture-create-datefacture" type="date" value={dateFacture} onChange={(e) => setDateFacture(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
            </div>
            <div>
              <label htmlFor="facture-create-echeance" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Échéance</label>
              <input id="facture-create-echeance" type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#666260", marginTop: 18 }}>Les lignes et montants pourront être ajoutés ensuite depuis la fiche de la facture.</div>
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid #2C2C2C", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0, background: "#1A1A1A" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "transparent", border: "1px solid #383838", borderRadius: 7, color: "#888480", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "9px 20px", background: "#4ADE80", border: "none", borderRadius: 7, color: "#0A1A0A", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
            {saving ? "Création…" : "Créer la facture"}
          </button>
        </div>
    </Modal>
  );
}
