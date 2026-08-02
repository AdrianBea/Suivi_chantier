"use client";

import { useCallback, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { MAX_UPLOAD_BYTES } from "@/components/PdfUploadForm";

interface Props {
  onUpload: (file: File, libelle?: string) => Promise<void>;
}

// ponytail: composant dédié plutôt que de généraliser PdfUploadForm — celui-ci porte
// un sélecteur de mode d'extraction LLM hors sujet ici, et n'a qu'un seul usage réel
// (devis/import) donc pas d'intérêt à risquer une régression pour le partager.
export function PieceJointeUploadForm({ onUpload }: Props) {
  const [libelle, setLibelle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[], rejected: FileRejection[]) => {
      if (accepted.length === 0) {
        if (rejected.some((r) => r.errors.some((e) => e.code === "file-too-large")))
          setError("Le fichier ne doit pas dépasser 25 Mo.");
        return;
      }
      setError(null);
      setLoading(true);
      try {
        await onUpload(accepted[0], libelle.trim() || undefined);
        setLibelle("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'import.");
      } finally {
        setLoading(false);
      }
    },
    [onUpload, libelle]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 1,
    maxSize: MAX_UPLOAD_BYTES,
    disabled: loading,
  });

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="piece-jointe-libelle" style={{ display: "block", fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Libellé (optionnel)</label>
        <input
          id="piece-jointe-libelle"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          disabled={loading}
          placeholder="Ex. Virement du 12/03"
          className="nm-input"
          style={{ width: "100%", padding: "9px 12px", fontSize: 13, fontFamily: "inherit" }}
        />
      </div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "var(--nm-accent)" : "var(--nm-border-strong)"}`,
          borderRadius: "var(--nm-radius-md)",
          padding: 24,
          textAlign: "center",
          cursor: loading ? "not-allowed" : "pointer",
          background: isDragActive ? "var(--nm-accent-soft-bg)" : "var(--nm-base-sunken)",
          boxShadow: isDragActive ? "none" : "var(--nm-shadow-pressed)",
          opacity: loading ? 0.5 : 1,
          transition: "background-color 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out",
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p style={{ color: "var(--nm-text-muted)", fontSize: 12 }}>Envoi en cours…</p>
        ) : isDragActive ? (
          <p style={{ color: "var(--nm-accent)", fontSize: 12 }}>Déposez le fichier ici</p>
        ) : (
          <div>
            <p style={{ color: "var(--nm-text-muted)", fontSize: 12 }}>Déposer un fichier (PDF, JPG, PNG)</p>
            <p style={{ fontSize: 11, color: "var(--nm-text-faint)", marginTop: 4 }}>Glissez-déposez ou cliquez pour sélectionner — 50 Mo max</p>
          </div>
        )}
      </div>
      {error && <p style={{ marginTop: 8, fontSize: 12, color: "var(--nm-danger)" }}>{error}</p>}
    </div>
  );
}
