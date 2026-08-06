"use client";

import { useCallback, useState } from "react";

export const TVA_DEFAUT = 20;

// tolère "1 200,50", "1200.5", espaces insécables et fines (copier-coller depuis un PDF/Excel FR)
export function parseMontant(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[\s  ]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return cleaned && !isNaN(n) ? n : null;
}

export const formatMontant = (n: number) => n.toFixed(2);

export const ttcDepuisHt = (ht: number, taux: number) => ht * (1 + taux / 100);
export const htDepuisTtc = (ttc: number, taux: number) => ttc / (1 + taux / 100);

export type TotauxInit = { tvaTaux?: number | null; totalHt?: number | null; totalTtc?: number | null };

const str = (n?: number | null) => (n != null ? n.toString() : "");

/**
 * Calcul en croix HT / TVA / TTC pour l'entête d'un devis ou d'une facture :
 * chaque champ saisi recalcule les deux autres, comme dans la modale de ligne.
 * Les champs restent des chaînes pour laisser l'utilisateur taper une saisie
 * intermédiaire ("1 2", "12,") sans que la valeur soit écrasée.
 */
export function useCalculTva(initial: TotauxInit) {
  const [tvaTaux, setTvaTaux] = useState(str(initial.tvaTaux));
  const [totalHt, setTotalHt] = useState(str(initial.totalHt));
  const [totalTtc, setTotalTtc] = useState(str(initial.totalTtc));

  const taux = parseMontant(tvaTaux) ?? TVA_DEFAUT;
  const ht = parseMontant(totalHt);
  const ttc = parseMontant(totalTtc);
  const montantTva = ht != null && ttc != null ? ttc - ht : null;

  const reset = useCallback((v: TotauxInit) => {
    setTvaTaux(str(v.tvaTaux));
    setTotalHt(str(v.totalHt));
    setTotalTtc(str(v.totalTtc));
  }, []);

  // changer le taux garde le HT comme référence ; sans HT saisi, on redescend depuis le TTC
  function handleTvaChange(v: string) {
    setTvaTaux(v);
    const nouveauTaux = parseMontant(v);
    if (nouveauTaux == null) return;
    if (ht != null) setTotalTtc(formatMontant(ttcDepuisHt(ht, nouveauTaux)));
    else if (ttc != null) setTotalHt(formatMontant(htDepuisTtc(ttc, nouveauTaux)));
  }

  function handleHtChange(v: string) {
    setTotalHt(v);
    const saisi = parseMontant(v);
    if (saisi != null) setTotalTtc(formatMontant(ttcDepuisHt(saisi, taux)));
  }

  function handleTtcChange(v: string) {
    setTotalTtc(v);
    const saisi = parseMontant(v);
    if (saisi != null) setTotalHt(formatMontant(htDepuisTtc(saisi, taux)));
  }

  return {
    tvaTaux,
    totalHt,
    totalTtc,
    taux,
    montantTva,
    handleTvaChange,
    handleHtChange,
    handleTtcChange,
    reset,
    // valeurs prêtes pour le PUT : undefined quand le champ est vide ou illisible
    values: {
      tvaTaux: parseMontant(tvaTaux) ?? undefined,
      totalHt: parseMontant(totalHt) ?? undefined,
      totalTtc: parseMontant(totalTtc) ?? undefined,
    },
  };
}
