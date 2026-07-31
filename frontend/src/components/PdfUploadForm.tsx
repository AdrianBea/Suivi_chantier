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
        <span style={{ color: "var(--nm-text-muted)" }}>Traiter le document en :</span>
        {(["Image", "Texte"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={loading}
            className="pressable"
            style={{
              padding: "5px 12px",
              borderRadius: "var(--nm-radius-sm)",
              border: "none",
              background: mode === m ? "var(--nm-base)" : "transparent",
              boxShadow: mode === m ? "var(--nm-shadow-pressed-sm)" : "none",
              color: mode === m ? "var(--nm-accent)" : "var(--nm-text-muted)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "background-color 180ms ease-out, box-shadow 180ms ease-out",
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "var(--nm-accent)" : "var(--nm-border-strong)"}`,
          borderRadius: "var(--nm-radius-md)",
          padding: 40,
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
          <p style={{ color: "var(--nm-text-muted)" }}>Analyse en cours… (peut prendre quelques minutes)</p>
        ) : isDragActive ? (
          <p style={{ color: "var(--nm-accent)" }}>Déposez le fichier ici</p>
        ) : (
          <div>
            <p style={{ color: "var(--nm-text-muted)" }}>{label}</p>
            <p style={{ fontSize: 13, color: "var(--nm-text-faint)", marginTop: 4 }}>Glissez-déposez ou cliquez pour sélectionner</p>
          </div>
        )}
      </div>
      {error && <p style={{ marginTop: 8, fontSize: 13, color: "var(--nm-danger)" }}>{error}</p>}
    </div>
  );
}
