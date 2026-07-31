"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { DevisDto, EntrepriseDto, TYPE_LOT_LABELS, TYPE_LOT_VALUES, TypeLot } from "@/lib/types";
import { EntrepriseCombobox } from "./EntrepriseCombobox";

export function DevisCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (devis: DevisDto) => void }) {
  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [entreprise, setEntreprise] = useState<{ entrepriseId?: number; entrepriseNom?: string }>({});
  const [numeroDevis, setNumeroDevis] = useState("");
  const [lot, setLot] = useState("");
  const [typeLot, setTypeLot] = useState<TypeLot | "">("");
  const [dateDevis, setDateDevis] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.entreprises.list().then(setEntreprises).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const devis = await api.devis.create({
        ...entreprise,
        numeroDevis: numeroDevis || undefined,
        lot: lot || undefined,
        typeLot: typeLot || undefined,
        dateDevis: dateDevis || undefined,
      });
      onCreated(devis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} width={520} titleId="devis-create-title">
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #2C2C2C", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "#1A1A1A" }}>
          <div id="devis-create-title" style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700, color: "#F0EDE8" }}>Nouveau devis</div>
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
              <label htmlFor="devis-create-entreprise" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Entreprise</label>
              <EntrepriseCombobox id="devis-create-entreprise" entreprises={entreprises} entrepriseId={entreprise.entrepriseId} entrepriseNom={entreprise.entrepriseNom} onChange={setEntreprise} />
            </div>
            <div>
              <label htmlFor="devis-create-numero" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Référence</label>
              <input id="devis-create-numero" value={numeroDevis} onChange={(e) => setNumeroDevis(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
            </div>
            <div>
              <label htmlFor="devis-create-lot" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Lot</label>
              <input id="devis-create-lot" value={lot} onChange={(e) => setLot(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
            </div>
            <div>
              <label htmlFor="devis-create-type" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Type</label>
              <select id="devis-create-type" value={typeLot} onChange={(e) => setTypeLot(e.target.value as TypeLot | "")} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}>
                <option value="">—</option>
                {TYPE_LOT_VALUES.map((t) => (
                  <option key={t} value={t}>{TYPE_LOT_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="devis-create-date" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Date</label>
              <input id="devis-create-date" type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#666260", marginTop: 18 }}>Les lignes et montants pourront être ajoutés ensuite depuis la fiche du devis.</div>
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid #2C2C2C", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0, background: "#1A1A1A" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "transparent", border: "1px solid #383838", borderRadius: 7, color: "#888480", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "9px 20px", background: "#4ADE80", border: "none", borderRadius: 7, color: "#0A1A0A", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
            {saving ? "Création…" : "Créer le devis"}
          </button>
        </div>
    </Modal>
  );
}
