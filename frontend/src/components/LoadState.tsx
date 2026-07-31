export function LoadState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <span style={{ fontSize: 13, color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)" }}>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: "14px 18px", background: "var(--nm-danger-bg)", border: "1px solid var(--nm-danger-border)", borderRadius: 8, fontSize: 13, color: "var(--nm-danger)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <span>{message}</span>
      <button onClick={onRetry} className="pressable" style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--nm-danger-border)", borderRadius: "var(--nm-radius-sm)", color: "var(--nm-danger)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
        Réessayer
      </button>
    </div>
  );
}
