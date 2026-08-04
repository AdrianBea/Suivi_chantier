"use client";

import { useEffect, useState } from "react";
import { AdminUserModal } from "@/components/AdminUserModal";
import { ListPageHeader, SearchInput, StatGrid } from "@/components/ListPageHeader";
import { ListTable } from "@/components/ListTable";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { formatDateLong, formatTaille } from "@/lib/format";
import { AdminUserDto } from "@/lib/types";

const COLUMNS = [
  { label: "Email", width: "1fr" },
  { label: "Nom", width: "150px" },
  { label: "Rôle", width: "110px" },
  { label: "Devis", width: "80px", align: "right" as const },
  { label: "Factures", width: "90px", align: "right" as const },
  { label: "Stockage", width: "100px", align: "right" as const },
  { label: "Inscrit le", width: "120px" },
  { label: "", width: "52px" },
];

export default function AdminComptesPage() {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [moiId, setMoiId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    Promise.all([api.admin.users(), api.auth.me()])
      .then(([liste, moi]) => { setUsers(liste); setMoiId(moi.id); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (!q) return true;
    return u.email.toLowerCase().includes(q)
      || (u.nom ?? "").toLowerCase().includes(q)
      || (u.prenom ?? "").toLowerCase().includes(q);
  });

  const totalOctets = users.reduce((s, u) => s + u.octetsStockes, 0);

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div className="page-shell">
        <ListPageHeader
          eyebrow="Supervision"
          title="Comptes"
          subtitle={`${users.length} compte${users.length > 1 ? "s" : ""} sur cette instance`}
        />

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        <StatGrid stats={[
          { label: "Comptes", value: String(users.length), color: "var(--nm-text-secondary)" },
          { label: "Admins", value: String(users.filter((u) => u.isAdmin).length), color: "var(--nm-info)" },
          { label: "Documents", value: String(users.reduce((s, u) => s + u.nbDevis + u.nbFactures, 0)), color: "var(--nm-text-secondary)" },
          { label: "Stockage total", value: formatTaille(totalOctets), color: "var(--nm-accent)", small: true },
        ]} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <SearchInput value={search} onChange={setSearch} />
        </div>

        <ListTable
          columns={COLUMNS}
          rows={filtered}
          rowKey={(u) => u.id}
          onRowClick={(u) => setSelected(u)}
          emptyLabel="Aucun résultat pour ce filtre"
          renderRow={(u) => (
            <>
              <div style={{ padding: "13px 12px 13px 0", fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {u.email}
                {u.id === moiId && <span style={{ marginLeft: 7, fontSize: 10, color: "var(--nm-text-faint)", fontFamily: "monospace" }}>vous</span>}
                {/* en carte les colonnes Nom/Rôle sont masquées : le badge admin remonte ici */}
                {u.isAdmin && <span className="show-mobile" style={{ marginLeft: 7, fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: "var(--nm-info)" }}>ADMIN</span>}
              </div>
              <div className="tc-hide-mobile" style={{ padding: "13px 12px", fontSize: 12, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {[u.prenom, u.nom].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="tc-hide-mobile" style={{ padding: "13px 12px" }}>
                <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: "monospace", background: u.isAdmin ? "var(--nm-info-bg)" : "transparent", color: u.isAdmin ? "var(--nm-info)" : "var(--nm-text-faint)" }}>
                  {u.isAdmin ? "ADMIN" : "—"}
                </span>
              </div>
              <div style={{ padding: "13px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--nm-text-muted)" }}>{u.nbDevis}</div>
              <div style={{ padding: "13px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--nm-text-muted)" }}>{u.nbFactures}</div>
              <div style={{ padding: "13px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)" }}>{formatTaille(u.octetsStockes)}</div>
              <div className="tc-hide-mobile" style={{ padding: "13px 12px", fontSize: 11, color: "var(--nm-text-faint)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatDateLong(u.createdAt)}</div>
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--nm-text-faint)" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </>
          )}
        />
        </>}
      </div>

      {selected && (
        <AdminUserModal
          user={selected}
          estMoiMeme={selected.id === moiId}
          onClose={() => setSelected(null)}
          onChanged={(u) => {
            setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
            setSelected(u);
          }}
          onDeleted={(id) => {
            setUsers((prev) => prev.filter((x) => x.id !== id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
