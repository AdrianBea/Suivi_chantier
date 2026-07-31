"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DevisCreateModal } from "@/components/DevisCreateModal";
import { DevisModal, statutBg, statutColor, statutLabel } from "@/components/DevisModal";
import { ListPageHeader, SearchInput, StatGrid } from "@/components/ListPageHeader";
import { ListTable } from "@/components/ListTable";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDate, formatEur } from "@/lib/format";
import { DevisDto, TYPE_LOT_COLORS, TYPE_LOT_LABELS } from "@/lib/types";

const COLUMNS = [
  { label: "Type de lot", width: "150px" },
  { label: "Référence", width: "110px" },
  { label: "Entreprise", width: "1fr" },
  { label: "Lot", width: "160px" },
  { label: "Date", width: "100px" },
  { label: "Montant HT", width: "110px", align: "right" as const },
  { label: "Montant TTC", width: "110px", align: "right" as const },
  { label: "Statut", width: "110px", align: "center" as const },
  { label: "", width: "52px", align: "center" as const },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevisPage() {
  const [devis, setDevis] = useState<DevisDto[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [selected, setSelected] = useState<DevisDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    api.devis.list().then(setDevis).catch((e) => setLoadError(e instanceof Error ? e.message : "Erreur de chargement")).finally(() => setLoading(false));
  }

  useEffect(load, []);

  // tant qu'un devis est en cours d'extraction, on relit la liste pour faire apparaître le résultat sans reload manuel
  useEffect(() => {
    const enAttente = devis.filter((d) => d.statut === "EnAttente");
    if (enAttente.length === 0) return;

    const timer = setInterval(() => {
      api.devis.list().then(setDevis).catch(() => {});
    }, 2500);

    return () => clearInterval(timer);
  }, [devis]);

  const q = search.trim().toLowerCase();
  const filtered = devis.filter((d) => {
    if (filterStatut !== "all" && d.statut !== filterStatut) return false;
    if (q && !( (d.numeroDevis ?? "").toLowerCase().includes(q) || (d.entreprise?.nom ?? "").toLowerCase().includes(q) || (d.lot ?? "").toLowerCase().includes(q) )) return false;
    return true;
  });

  const totalHT = devis.reduce((s, d) => s + (d.totalHt ?? 0), 0);
  const totalTTC = devis.reduce((s, d) => s + (d.totalTtc ?? 0), 0);
  const extraitCount = devis.filter((d) => d.statut === "Extrait").length;
  const enAttenteCount = devis.filter((d) => d.statut === "EnAttente").length;

  const pills = [
    { key: "all", label: "Tous" },
    { key: "Extrait", label: "Extrait" },
    { key: "EnAttente", label: "En attente" },
  ];

  function exportCsv() {
    const csv = toCsv(filtered, [
      { header: "Type de lot", value: (d) => (d.typeLot ? TYPE_LOT_LABELS[d.typeLot] : "") },
      { header: "Référence", value: (d) => d.numeroDevis },
      { header: "Entreprise", value: (d) => d.entreprise?.nom },
      { header: "Lot", value: (d) => d.lot },
      { header: "Date", value: (d) => d.dateDevis },
      { header: "Montant HT", value: (d) => d.totalHt },
      { header: "Montant TTC", value: (d) => d.totalTtc },
      { header: "Statut", value: (d) => statutLabel(d.statut) },
    ]);
    downloadCsv(`devis-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div style={{ padding: "32px 40px 56px" }}>
        <ListPageHeader
          eyebrow="Documents contractuels"
          title="Devis"
          subtitle={`${devis.length} devis · ${formatEur(totalHT)} HT · ${formatEur(totalTTC)} TTC au total`}
          actions={<>
            <button onClick={() => setCreating(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "transparent", border: "1px solid #383838", borderRadius: 8, color: "#E8E5E2", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#E8E5E2" strokeWidth="2" strokeLinecap="round"/></svg>
              Ajouter manuellement
            </button>
            <button onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "transparent", border: "1px solid #383838", borderRadius: 8, color: "#E8E5E2", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#E8E5E2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Exporter CSV
            </button>
            <Link href="/import" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#F97316", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Importer un devis
            </Link>
          </>}
        />

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        <StatGrid stats={[
          { label: "Total", value: String(devis.length), color: "#F0EDE8" },
          { label: "Extraits", value: String(extraitCount), color: "#4ADE80" },
          { label: "En attente", value: String(enAttenteCount), color: "#FCD34D" },
          { label: "Montant HT", value: formatEur(totalHT), color: "#F97316", small: true },
          { label: "Montant TTC", value: formatEur(totalTTC), color: "#F97316", small: true },
        ]} />

        {/* filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <SearchInput value={search} onChange={setSearch} />
          {pills.map((p) => {
            const active = filterStatut === p.key;
            return (
              <button key={p.key} onClick={() => setFilterStatut(p.key)} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${active ? (p.key === "Extrait" ? "#2C4A2C" : p.key === "EnAttente" ? "#4A3A0C" : "#444") : "#2C2C2C"}`, background: active ? (p.key === "Extrait" ? "#162216" : p.key === "EnAttente" ? "#231D0C" : "#2A2A2A") : "#1E1E1E", color: active ? (p.key === "Extrait" ? "#4ADE80" : p.key === "EnAttente" ? "#FCD34D" : "#F0EDE8") : "#888480", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {p.label}
              </button>
            );
          })}
        </div>

        <ListTable
          columns={COLUMNS}
          rows={filtered}
          rowKey={(d) => d.id}
          onRowClick={(d) => api.devis.getById(d.id).then(setSelected)}
          emptyLabel="Aucun résultat pour ce filtre"
          renderRow={(d) => (
            <>
              <div style={{ padding: "13px 12px 13px 0", display: "flex", alignItems: "center" }}>
                {d.typeLot ? (
                  <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "monospace", background: `${TYPE_LOT_COLORS[d.typeLot]}22`, color: TYPE_LOT_COLORS[d.typeLot], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{TYPE_LOT_LABELS[d.typeLot]}</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#444" }}>—</span>
                )}
              </div>
              <div style={{ padding: "13px 12px 13px 0", fontFamily: "monospace", fontSize: 11, color: "#888480", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.numeroDevis ?? "—"}</div>
              <div style={{ padding: "13px 12px", minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#E8E5E2", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.entreprise?.nom ?? "—"}</div>
              </div>
              <div style={{ padding: "13px 12px", fontSize: 12, color: "#A09C98", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.lot ?? "—"}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 11, color: "#888480", whiteSpace: "nowrap" }}>{formatDate(d.dateDevis)}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 13, color: "#C0BDB8", textAlign: "right", whiteSpace: "nowrap" }}>{formatEur(d.totalHt)}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 13, color: "#E8E5E2", fontWeight: 500, textAlign: "right", whiteSpace: "nowrap" }}>{formatEur(d.totalTtc)}</div>
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "monospace", background: statutBg(d.statut), color: statutColor(d.statut), whiteSpace: "nowrap" }}>{statutLabel(d.statut)}</span>
              </div>
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#555250" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </>
          )}
        />
        </>}
      </div>

      {selected && (
        <DevisModal
          devis={selected}
          onClose={() => setSelected(null)}
          onDeleted={(id) => {
            setDevis((prev) => prev.filter((d) => d.id !== id));
            setSelected(null);
          }}
          onUpdated={(updated) => {
            setDevis((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          }}
        />
      )}

      {creating && (
        <DevisCreateModal
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setDevis((prev) => [created, ...prev]);
            setCreating(false);
            setSelected(created);
          }}
        />
      )}
    </div>
  );
}
