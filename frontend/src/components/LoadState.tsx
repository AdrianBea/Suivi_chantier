export function LoadState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <span style={{ fontSize: 13, color: "#888480", fontFamily: "var(--font-jetbrains-mono)" }}>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: "14px 18px", background: "#221212", border: "1px solid #3A1818", borderRadius: 8, fontSize: 13, color: "#F87171", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <span>{message}</span>
      <button onClick={onRetry} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #4A2323", borderRadius: 6, color: "#F87171", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
        Réessayer
      </button>
    </div>
  );
}
