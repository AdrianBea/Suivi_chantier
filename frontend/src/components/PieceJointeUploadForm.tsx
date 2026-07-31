"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

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
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
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
    disabled: loading,
  });

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="piece-jointe-libelle" style={{ display: "block", fontSize: 10, color: "#666260", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Libellé (optionnel)</label>
        <input
          id="piece-jointe-libelle"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          disabled={loading}
          placeholder="Ex. Virement du 12/03"
          style={{ width: "100%", background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "inherit" }}
        />
      </div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#F97316" : "#333"}`,
          borderRadius: 8,
          padding: 24,
          textAlign: "center",
          cursor: loading ? "not-allowed" : "pointer",
          background: isDragActive ? "#2A1D0C" : "transparent",
          opacity: loading ? 0.5 : 1,
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p style={{ color: "#888480", fontSize: 12 }}>Envoi en cours…</p>
        ) : isDragActive ? (
          <p style={{ color: "#F97316", fontSize: 12 }}>Déposez le fichier ici</p>
        ) : (
          <div>
            <p style={{ color: "#A09C98", fontSize: 12 }}>Déposer un fichier (PDF, JPG, PNG)</p>
            <p style={{ fontSize: 11, color: "#666260", marginTop: 4 }}>Glissez-déposez ou cliquez pour sélectionner — 50 Mo max</p>
          </div>
        )}
      </div>
      {error && <p style={{ marginTop: 8, fontSize: 12, color: "#F87171" }}>{error}</p>}
    </div>
  );
}
