"use client";

import { useEffect, useState } from "react";
import { EntrepriseModal } from "@/components/EntrepriseModal";
import { ListPageHeader, SearchInput } from "@/components/ListPageHeader";
import { ListTable } from "@/components/ListTable";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { EntrepriseDto } from "@/lib/types";

const COLUMNS = [
  { label: "Nom", width: "1fr" },
  { label: "SIRET", width: "160px" },
  { label: "Contact", width: "160px" },
  { label: "Téléphone", width: "140px" },
  { label: "Email", width: "220px" },
  { label: "", width: "52px" },
];

export default function EntreprisesPage() {
  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EntrepriseDto | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    api.entreprises.list().then(setEntreprises).catch((e) => setLoadError(e instanceof Error ? e.message : "Erreur de chargement")).finally(() => setLoading(false));
  }

  useEffect(load, []);

  const q = search.trim().toLowerCase();
  const filtered = entreprises.filter((e) => {
    if (q && !((e.nom ?? "").toLowerCase().includes(q) || (e.siret ?? "").toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div className="page-shell">
        <ListPageHeader
          eyebrow="Répertoire"
          title="Entreprises"
          subtitle={`${entreprises.length} entreprise${entreprises.length > 1 ? "s" : ""} recensée${entreprises.length > 1 ? "s" : ""}`}
          actions={
            <button onClick={() => setSelected("new")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--nm-accent)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Ajouter une entreprise
            </button>
          }
        />

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        {/* filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <SearchInput value={search} onChange={setSearch} />
        </div>

        <ListTable
          columns={COLUMNS}
          rows={filtered}
          rowKey={(e) => e.id}
          onRowClick={(e) => setSelected(e)}
          emptyLabel="Aucun résultat pour ce filtre"
          renderRow={(e) => (
            <>
              <div style={{ padding: "13px 12px 13px 0", fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.nom}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.siret ?? "—"}</div>
              <div style={{ padding: "13px 12px", fontSize: 12, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.contactNom ?? "—"}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.contactTel ?? "—"}</div>
              <div style={{ padding: "13px 12px", fontSize: 12, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.contactEmail ?? "—"}</div>
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--nm-text-faint)" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </>
          )}
        />
        </>}
      </div>

      {selected && (
        <EntrepriseModal
          entreprise={selected}
          onClose={() => setSelected(null)}
          onSaved={(saved) => {
            setEntreprises((prev) => {
              const exists = prev.some((e) => e.id === saved.id);
              return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved].sort((a, b) => a.nom.localeCompare(b.nom));
            });
            setSelected(null);
          }}
          onDeleted={(id) => {
            setEntreprises((prev) => prev.filter((e) => e.id !== id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
