"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { EntrepriseDto } from "@/lib/types";

const FIELDS: { key: keyof Omit<EntrepriseDto, "id">; label: string }[] = [
  { key: "nom", label: "Nom" },
  { key: "siret", label: "SIRET" },
  { key: "contactNom", label: "Contact" },
  { key: "contactTel", label: "Téléphone" },
  { key: "contactEmail", label: "Email" },
  { key: "adresse", label: "Adresse" },
];

export function EntrepriseModal({ entreprise, onClose, onSaved, onDeleted }: {
  entreprise: EntrepriseDto | "new";
  onClose: () => void;
  onSaved: (e: EntrepriseDto) => void;
  onDeleted: (id: number) => void;
}) {
  const isNew = entreprise === "new";
  const [nom, setNom] = useState(isNew ? "" : entreprise.nom ?? "");
  const [siret, setSiret] = useState(isNew ? "" : entreprise.siret ?? "");
  const [contactNom, setContactNom] = useState(isNew ? "" : entreprise.contactNom ?? "");
  const [contactTel, setContactTel] = useState(isNew ? "" : entreprise.contactTel ?? "");
  const [contactEmail, setContactEmail] = useState(isNew ? "" : entreprise.contactEmail ?? "");
  const [adresse, setAdresse] = useState(isNew ? "" : entreprise.adresse ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const values: Record<string, [string, (v: string) => void]> = {
    nom: [nom, setNom],
    siret: [siret, setSiret],
    contactNom: [contactNom, setContactNom],
    contactTel: [contactTel, setContactTel],
    contactEmail: [contactEmail, setContactEmail],
    adresse: [adresse, setAdresse],
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const dto = {
        nom,
        siret: siret || undefined,
        contactNom: contactNom || undefined,
        contactTel: contactTel || undefined,
        contactEmail: contactEmail || undefined,
        adresse: adresse || undefined,
      };
      const saved = isNew
        ? await api.entreprises.create(dto)
        : await api.entreprises.update(entreprise.id, dto);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    try {
      await api.entreprises.delete(entreprise.id);
      onDeleted(entreprise.id);
    } catch (e) {
      setConfirmDelete(false);
      setError(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  return (
    <>
      <Modal onClose={onClose} width={480} titleId="entreprise-modal-title">
        {/* header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #2C2C2C", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "#1A1A1A" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="entreprise-modal-title" style={{ fontSize: 18, fontWeight: 700, color: "#F0EDE8" }}>{isNew ? "Nouvelle entreprise" : "Modifier l'entreprise"}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, background: "#2A2A2A", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#888480" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {error && (
            <div style={{ background: "#2A1616", border: "1px solid #4A2323", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#F87171" }}>{error}</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            {FIELDS.map(({ key, label }) => {
              const [value, setValue] = values[key];
              return (
                <div key={key}>
                  <label htmlFor={`entreprise-${key}`} style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>{label}</label>
                  <input id={`entreprise-${key}`} value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #2C2C2C", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#1A1A1A" }}>
          {!isNew ? (
            <button onClick={() => setConfirmDelete(true)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid #4A2323", borderRadius: 7, color: "#F87171", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Supprimer
            </button>
          ) : <div />}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "9px 20px", background: "transparent", border: "1px solid #383838", borderRadius: 7, color: "#888480", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={handleSave} disabled={saving || !nom} style={{ padding: "9px 20px", background: "#4ADE80", border: "none", borderRadius: 7, color: "#0A1A0A", fontSize: 13, fontWeight: 700, cursor: saving || !nom ? "not-allowed" : "pointer", opacity: saving || !nom ? 0.6 : 1, fontFamily: "inherit" }}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} width={380} titleId="entreprise-delete-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="entreprise-delete-title" style={{ fontSize: 15, fontWeight: 700, color: "#F0EDE8", marginBottom: 8 }}>Supprimer cette entreprise ?</div>
            <div style={{ fontSize: 13, color: "#A09C98", marginBottom: 22, lineHeight: 1.5 }}>
              {!isNew && `${entreprise.nom} sera définitivement supprimée. Cette action est irréversible.`}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid #383838", borderRadius: 7, color: "#888480", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleDelete} style={{ padding: "9px 18px", background: "#F87171", border: "none", borderRadius: 7, color: "#1A0A0A", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
