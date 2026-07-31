"use client";

import { useEffect, useId, useState } from "react";
import { EntrepriseDto } from "@/lib/types";

export function EntrepriseCombobox({
  id,
  entreprises,
  entrepriseId,
  entrepriseNom,
  onChange,
  disabled,
}: {
  id?: string;
  entreprises: EntrepriseDto[];
  entrepriseId?: number;
  entrepriseNom?: string;
  onChange: (value: { entrepriseId?: number; entrepriseNom?: string }) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const selected = entreprises.find((e) => e.id === entrepriseId);
  const [text, setText] = useState(selected?.nom ?? entrepriseNom ?? "");

  useEffect(() => {
    setText(selected?.nom ?? entrepriseNom ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId]);

  return (
    <>
      <input
        id={id}
        list={listId}
        value={text}
        disabled={disabled}
        placeholder="Nom de l'entreprise…"
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          const match = entreprises.find((entr) => entr.nom === value);
          onChange(match ? { entrepriseId: match.id, entrepriseNom: undefined } : { entrepriseId: undefined, entrepriseNom: value || undefined });
        }}
        style={{ width: "100%", background: "var(--nm-base-sunken)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "inherit" }}
      />
      <datalist id={listId}>
        {entreprises.map((e) => (
          <option key={e.id} value={e.nom} />
        ))}
      </datalist>
    </>
  );
}
