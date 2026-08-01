"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { statutBg, statutColor, statutLabel } from "@/components/DevisModal";
import { FactureCreateModal } from "@/components/FactureCreateModal";
import { FactureModal } from "@/components/FactureModal";
import { ListPageHeader, SearchInput, StatGrid } from "@/components/ListPageHeader";
import { ListTable } from "@/components/ListTable";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { formatDate, formatEur } from "@/lib/format";
import { FactureDto, TYPE_LOT_COLORS, TYPE_LOT_LABELS, TYPE_LOT_VALUES } from "@/lib/types";

const COLUMNS = [
  { label: "Type de lot", width: "150px" },
  { label: "N° Facture", width: "110px" },
  { label: "Entreprise", width: "1fr" },
  { label: "Devis lié", width: "110px", align: "center" as const },
  { label: "Date", width: "100px" },
  { label: "Montant HT", width: "110px", align: "right" as const },
  { label: "Montant TTC", width: "110px", align: "right" as const },
  { label: "", width: "90px" },
  { label: "Statut", width: "110px", align: "center" as const },
  { label: "", width: "52px", align: "center" as const },
];

export default function FacturesPage() {
  const [factures, setFactures] = useState<FactureDto[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterTypeLot, setFilterTypeLot] = useState("all");
  const [selected, setSelected] = useState<FactureDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    api.factures.list().then(setFactures).catch((e) => setLoadError(e instanceof Error ? e.message : "Erreur de chargement")).finally(() => setLoading(false));
  }

  useEffect(load, []);

  // tant qu'une facture est en cours d'extraction, on relit la liste pour faire apparaître le résultat sans reload manuel
  useEffect(() => {
    const enAttente = factures.filter((f) => f.statut === "EnAttente");
    if (enAttente.length === 0) return;

    const timer = setInterval(() => {
      api.factures.list().then(setFactures).catch(() => {});
    }, 2500);

    return () => clearInterval(timer);
  }, [factures]);

  const q = search.trim().toLowerCase();
  const filtered = factures.filter((f) => {
    if (filterStatut !== "all" && f.statut !== filterStatut) return false;
    if (filterTypeLot !== "all" && f.typeLot !== filterTypeLot) return false;
    if (q && !((f.numeroFacture ?? "").toLowerCase().includes(q) || (f.entreprise?.nom ?? "").toLowerCase().includes(q))) return false;
    return true;
  });

  const totalHT = factures.reduce((s, f) => s + (f.totalHt ?? 0), 0);
  const totalTTC = factures.reduce((s, f) => s + (f.totalTtc ?? 0), 0);
  const extraitCount = factures.filter((f) => f.statut === "Extrait").length;
  const enAttenteCount = factures.filter((f) => f.statut === "EnAttente").length;

  const pills = [
    { key: "all", label: "Tous" },
    { key: "Extrait", label: "Extrait" },
    { key: "EnAttente", label: "En attente" },
  ];

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div className="page-shell">
        <ListPageHeader
          eyebrow="Documents contractuels"
          title="Factures"
          subtitle={`${factures.length} factures · ${formatEur(totalHT)} HT · ${formatEur(totalTTC)} TTC au total`}
          actions={<>
            <button onClick={() => setCreating(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 8, color: "var(--nm-text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="var(--nm-text-secondary)" strokeWidth="2" strokeLinecap="round"/></svg>
              Ajouter manuellement
            </button>
            <Link href="/import?type=FAC" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--nm-accent)", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Importer une facture
            </Link>
          </>}
        />

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        <StatGrid stats={[
          { label: "Total", value: String(factures.length), color: "var(--nm-text-primary)" },
          { label: "Extraites", value: String(extraitCount), color: "var(--nm-success)" },
          { label: "En attente", value: String(enAttenteCount), color: "var(--nm-warning)" },
          { label: "Montant HT", value: formatEur(totalHT), color: "var(--nm-accent)", small: true },
          { label: "Montant TTC", value: formatEur(totalTTC), color: "var(--nm-accent)", small: true },
        ]} />

        {/* filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <SearchInput value={search} onChange={setSearch} />
          {pills.map((p) => {
            const active = filterStatut === p.key;
            return (
              <button key={p.key} onClick={() => setFilterStatut(p.key)} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${active ? (p.key === "Extrait" ? "var(--nm-success)" : p.key === "EnAttente" ? "var(--nm-accent-soft-bg)" : "var(--nm-text-disabled)") : "var(--nm-border)"}`, background: active ? (p.key === "Extrait" ? "var(--nm-success-bg)" : p.key === "EnAttente" ? "var(--nm-accent-soft-bg)" : "var(--nm-base-raised)") : "var(--nm-base)", color: active ? (p.key === "Extrait" ? "var(--nm-success)" : p.key === "EnAttente" ? "var(--nm-warning)" : "var(--nm-text-primary)") : "var(--nm-text-muted)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {p.label}
              </button>
            );
          })}
          <select
            value={filterTypeLot}
            onChange={(e) => setFilterTypeLot(e.target.value)}
            aria-label="Filtrer par lot"
            className="nm-input"
            style={{ padding: "8px 12px", fontSize: 12, fontFamily: "inherit", maxWidth: 220 }}
          >
            <option value="all">Tous les lots</option>
            {TYPE_LOT_VALUES.map((v) => (
              <option key={v} value={v}>{TYPE_LOT_LABELS[v]}</option>
            ))}
          </select>
        </div>

        <ListTable
          columns={COLUMNS}
          rows={filtered}
          rowKey={(f) => f.id}
          onRowClick={(f) => api.factures.getById(f.id).then(setSelected)}
          emptyLabel="Aucun résultat pour ce filtre"
          renderRow={(f) => (
            <>
              <div style={{ padding: "13px 12px 13px 0", display: "flex", alignItems: "center" }}>
                {f.typeLot ? (
                  <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "monospace", background: `${TYPE_LOT_COLORS[f.typeLot]}22`, color: TYPE_LOT_COLORS[f.typeLot], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{TYPE_LOT_LABELS[f.typeLot]}</span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--nm-text-disabled)" }}>—</span>
                )}
              </div>
              <div style={{ padding: "13px 12px 13px 0", fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.numeroFacture ?? "—"}</div>
              <div style={{ padding: "13px 12px", minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.entreprise?.nom ?? (f.statut !== "Extrait" ? f.fichierPdfNom : undefined) ?? "—"}</div>
              </div>
              <div style={{ padding: "13px 12px", fontSize: 11, textAlign: "center", fontFamily: "monospace" }}>
                {f.devisId ? <span style={{ color: "var(--nm-accent-hover)" }}>#{f.devisId}</span> : <span style={{ color: "var(--nm-text-disabled)" }}>—</span>}
              </div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)", whiteSpace: "nowrap" }}>{formatDate(f.dateFacture)}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 13, color: "var(--nm-text-tertiary)", textAlign: "right", whiteSpace: "nowrap" }}>{formatEur(f.totalHt)}</div>
              <div style={{ padding: "13px 12px", fontFamily: "monospace", fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, textAlign: "right", whiteSpace: "nowrap" }}>{formatEur(f.totalTtc)}</div>
              <div />
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "monospace", background: statutBg(f.statut), color: statutColor(f.statut), whiteSpace: "nowrap" }}>{statutLabel(f.statut)}</span>
              </div>
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--nm-text-faint)" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </>
          )}
        />
        </>}
      </div>

      {selected && (
        <FactureModal
          facture={selected}
          onClose={() => setSelected(null)}
          onDeleted={(id) => {
            setFactures((prev) => prev.filter((f) => f.id !== id));
            setSelected(null);
          }}
          onUpdated={(updated) => {
            setFactures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          }}
        />
      )}

      {creating && (
        <FactureCreateModal
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setFactures((prev) => [created, ...prev]);
            setCreating(false);
            setSelected(created);
          }}
        />
      )}
    </div>
  );
}
