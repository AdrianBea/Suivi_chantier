import { StatutExtraction } from "@/lib/types";

export const STATUT_CONFIG: Record<StatutExtraction, { label: string; bg: string; color: string }> = {
  Extrait: { label: "EXTRAIT", bg: "var(--nm-success-bg)", color: "var(--nm-success)" },
  EnAttente: { label: "EN ATTENTE", bg: "var(--nm-accent-soft-bg)", color: "var(--nm-warning)" },
  Erreur: { label: "ERREUR", bg: "var(--nm-danger-bg)", color: "var(--nm-danger)" },
};

export const STATUT_VALUES = ["EnAttente", "Extrait", "Erreur"] as const satisfies readonly StatutExtraction[];

export function statutLabel(s: StatutExtraction) {
  return STATUT_CONFIG[s]?.label ?? STATUT_CONFIG.Erreur.label;
}
export function statutBg(s: StatutExtraction) {
  return STATUT_CONFIG[s]?.bg ?? STATUT_CONFIG.Erreur.bg;
}
export function statutColor(s: StatutExtraction) {
  return STATUT_CONFIG[s]?.color ?? STATUT_CONFIG.Erreur.color;
}
