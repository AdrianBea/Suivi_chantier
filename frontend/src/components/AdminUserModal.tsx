"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { api } from "@/lib/api";
import { formatDateLong, formatTaille } from "@/lib/format";
import { AdminUserDto } from "@/lib/types";

/**
 * Fiche d'un compte + les deux actions sensibles (rôle, suppression).
 * `estMoiMeme` désactive les deux : le backend les refuse déjà (400), on évite
 * juste à l'admin de découvrir le refus après coup.
 */
export function AdminUserModal({ user, estMoiMeme, onClose, onChanged, onDeleted }: {
  user: AdminUserDto;
  estMoiMeme: boolean;
  onClose: () => void;
  onChanged: (u: AdminUserDto) => void;
  onDeleted: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailSaisi, setEmailSaisi] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le badge repasse au rôle en base, mais la session de la personne porte encore
  // l'ancien : on le signale plutôt que d'afficher un changement déjà effectif.
  const [rolePending, setRolePending] = useState(false);

  const nomComplet = [user.prenom, user.nom].filter(Boolean).join(" ") || "—";

  async function toggleAdmin() {
    setBusy(true);
    setError(null);
    try {
      await api.admin.setAdmin(user.id, !user.isAdmin);
      onChanged({ ...user, isAdmin: !user.isAdmin });
      setRolePending(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await api.admin.deleteUser(user.id);
      onDeleted(user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* > 520 : Modal bascule en plein écran sur mobile, nécessaire vu la densité
          (grille de chiffres + actions + zone dangereuse). */}
      <Modal onClose={onClose} width={560} titleId="admin-user-title">
        <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid var(--nm-border)", flexShrink: 0 }}>
          <div id="admin-user-title" style={{ fontSize: 16, fontWeight: 700, wordBreak: "break-word" }}>{user.email}</div>
          <div style={{ fontSize: 12, color: "var(--nm-text-muted)", marginTop: 4 }}>
            {nomComplet} · inscrit le {formatDateLong(user.createdAt)}
            {estMoiMeme && " · vous"}
          </div>
        </div>

        <div style={{ padding: "20px 28px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginBottom: 22 }}>
            <Chiffre label="Devis" valeur={String(user.nbDevis)} />
            <Chiffre label="Factures" valeur={String(user.nbFactures)} />
            <Chiffre label="Entreprises" valeur={String(user.nbEntreprises)} />
            <Chiffre label="Stockage" valeur={formatTaille(user.octetsStockes)} />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "var(--nm-danger)", marginBottom: 16 }}>{error}</div>
          )}

          <div style={{ fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 10 }}>Rôle</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, fontFamily: "monospace", background: user.isAdmin ? "var(--nm-info-bg)" : "var(--nm-base-sunken)", color: user.isAdmin ? "var(--nm-info)" : "var(--nm-text-muted)" }}>
              {user.isAdmin ? "ADMIN" : "UTILISATEUR"}
            </span>
            {rolePending && (
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--nm-warning)" }}>EN ATTENTE DE RECONNEXION</span>
            )}
            <button
              onClick={toggleAdmin}
              disabled={busy || estMoiMeme}
              style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-secondary)", fontSize: 13, fontFamily: "inherit", cursor: busy || estMoiMeme ? "not-allowed" : "pointer", opacity: busy || estMoiMeme ? 0.5 : 1 }}
            >
              {user.isAdmin ? "Retirer les droits admin" : "Promouvoir administrateur"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--nm-text-faint)", lineHeight: 1.5, marginBottom: 24 }}>
            {estMoiMeme
              ? "Vous ne pouvez pas modifier votre propre statut : cela risquerait de laisser l'application sans administrateur."
              : "Le changement prend effet à la prochaine connexion de la personne — son statut est inscrit dans sa session, valable 7 jours."}
          </div>

          <div style={{ fontSize: 10, color: "var(--nm-danger)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 10 }}>Zone dangereuse</div>
          <button
            onClick={() => { setEmailSaisi(""); setConfirmDelete(true); }}
            disabled={busy || estMoiMeme}
            style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: 7, color: "var(--nm-danger)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: busy || estMoiMeme ? "not-allowed" : "pointer", opacity: busy || estMoiMeme ? 0.5 : 1 }}
          >
            Supprimer ce compte
          </button>
        </div>

        <div style={{ padding: "14px 28px", borderTop: "1px solid var(--nm-border)", display: "flex", justifyContent: "flex-end", flexShrink: 0, background: "var(--nm-base-raised)" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>
        </div>
      </Modal>

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} width={420} titleId="admin-user-delete-title">
          <div style={{ padding: "24px 24px 20px" }}>
            <div id="admin-user-delete-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 8 }}>Supprimer ce compte ?</div>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              {user.nbDevis} devis, {user.nbFactures} factures et {user.nbEntreprises} entreprises seront
              définitivement effacés, ainsi que les PDF associés ({formatTaille(user.octetsStockes)}).
              Cette action est irréversible.
            </div>
            {/* La saisie de l'email évite le clic réflexe : rien ici n'est récupérable. */}
            <label htmlFor="admin-confirm-email" style={{ display: "block", fontSize: 11, color: "var(--nm-text-muted)", marginBottom: 6 }}>
              Saisissez <strong style={{ color: "var(--nm-text-secondary)" }}>{user.email}</strong> pour confirmer
            </label>
            <input
              id="admin-confirm-email"
              value={emailSaisi}
              onChange={(e) => setEmailSaisi(e.target.value)}
              autoComplete="off"
              style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit", marginBottom: 20 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button
                onClick={handleDelete}
                disabled={busy || emailSaisi.trim().toLowerCase() !== user.email.toLowerCase()}
                style={{ padding: "9px 18px", background: "var(--nm-danger)", border: "none", borderRadius: 7, color: "var(--nm-text-on-accent)", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: busy || emailSaisi.trim().toLowerCase() !== user.email.toLowerCase() ? "not-allowed" : "pointer", opacity: busy || emailSaisi.trim().toLowerCase() !== user.email.toLowerCase() ? 0.5 : 1 }}
              >
                {busy ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Chiffre({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="nm-inset" style={{ padding: "12px 14px", borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: "var(--nm-text-muted)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "monospace", color: "var(--nm-text-secondary)" }}>{valeur}</div>
    </div>
  );
}
