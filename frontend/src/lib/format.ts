export function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

export function formatEur(v?: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

/** Sans centimes, ex. "12 345 €" — pour les gros montants dans les KPI. */
export function formatEurRounded(v?: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v) + " €";
}

/** Compact en milliers, ex. "120 k€" — pour les barres de progression par lot. */
export function formatEurCompact(v?: number | null): string {
  if (v == null || v === 0) return "0 k€";
  return (v / 1000).toFixed(0) + " k€";
}

/** Date longue, ex. "3 juil. 2026" — pour les listes de documents récents. */
export function formatDateLong(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Taille de fichier, ex. "482 Ko" / "1.3 Mo". */
export function formatTaille(octets: number): string {
  if (octets < 1024 * 1024) return (octets / 1024).toFixed(0) + " Ko";
  return (octets / (1024 * 1024)).toFixed(1) + " Mo";
}
