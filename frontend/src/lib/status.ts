import { StatutExtraction } from "@/lib/types";

export const STATUT_CONFIG: Record<StatutExtraction, { label: string; bg: string; color: string }> = {
  Extrait: { label: "EXTRAIT", bg: "#162216", color: "#4ADE80" },
  EnAttente: { label: "EN ATTENTE", bg: "#231D0C", color: "#FCD34D" },
  Erreur: { label: "ERREUR", bg: "#221212", color: "#F87171" },
};

export function statutLabel(s: StatutExtraction) {
  return STATUT_CONFIG[s]?.label ?? STATUT_CONFIG.Erreur.label;
}
export function statutBg(s: StatutExtraction) {
  return STATUT_CONFIG[s]?.bg ?? STATUT_CONFIG.Erreur.bg;
}
export function statutColor(s: StatutExtraction) {
  return STATUT_CONFIG[s]?.color ?? STATUT_CONFIG.Erreur.color;
}
