"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export type ExtractionMode = "Image" | "Texte";

interface Props {
  onUpload: (file: File, mode: ExtractionMode) => Promise<void>;
  label?: string;
}

export function PdfUploadForm({ onUpload, label = "Déposer un fichier PDF" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ExtractionMode>("Image");

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      setError(null);
      setLoading(true);
      try {
        await onUpload(accepted[0], mode);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'import.");
      } finally {
        setLoading(false);
      }
    },
    [onUpload, mode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: "#A09C98" }}>Traiter le document en :</span>
        {(["Image", "Texte"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={loading}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: `1px solid ${mode === m ? "#F97316" : "#333"}`,
              background: mode === m ? "#2A1D0C" : "transparent",
              color: mode === m ? "#F97316" : "#A09C98",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#F97316" : "#333"}`,
          borderRadius: 8,
          padding: 40,
          textAlign: "center",
          cursor: loading ? "not-allowed" : "pointer",
          background: isDragActive ? "#2A1D0C" : "transparent",
          opacity: loading ? 0.5 : 1,
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p style={{ color: "#888480" }}>Analyse en cours… (peut prendre quelques minutes)</p>
        ) : isDragActive ? (
          <p style={{ color: "#F97316" }}>Déposez le fichier ici</p>
        ) : (
          <div>
            <p style={{ color: "#A09C98" }}>{label}</p>
            <p style={{ fontSize: 13, color: "#666260", marginTop: 4 }}>Glissez-déposez ou cliquez pour sélectionner</p>
          </div>
        )}
      </div>
      {error && <p style={{ marginTop: 8, fontSize: 13, color: "#F87171" }}>{error}</p>}
    </div>
  );
}
