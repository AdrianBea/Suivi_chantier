import { STATUT_CONFIG } from "@/lib/status";
import { StatutExtraction } from "@/lib/types";

export function StatusBadge({ statut }: { statut: StatutExtraction }) {
  const { label, bg, color } = STATUT_CONFIG[statut] ?? STATUT_CONFIG.Erreur;
  return (
    <span
      style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", background: bg, color }}
    >
      {label}
    </span>
  );
}
