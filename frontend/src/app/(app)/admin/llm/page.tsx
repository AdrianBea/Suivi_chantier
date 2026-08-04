"use client";

import { useCallback, useEffect, useState } from "react";
import { EchangesLlm } from "@/components/EchangesLlm";
import { ListPageHeader, StatGrid } from "@/components/ListPageHeader";
import { ListTable } from "@/components/ListTable";
import { ErrorState, LoadState } from "@/components/LoadState";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { LlmExchangeListDto, LlmStatsDto } from "@/lib/types";

const COLUMNS = [
  { label: "État", width: "90px" },
  { label: "Document", width: "130px" },
  { label: "Modèle", width: "1fr" },
  { label: "Pages", width: "80px", align: "right" as const },
  { label: "Durée", width: "90px", align: "right" as const },
  { label: "Date", width: "160px" },
  { label: "", width: "52px" },
];

type Filtre = "tous" | "ok" | "erreur";

export default function AdminLlmPage() {
  const [stats, setStats] = useState<LlmStatsDto | null>(null);
  const [echanges, setEchanges] = useState<LlmExchangeListDto[]>([]);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [selected, setSelected] = useState<LlmExchangeListDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Le filtre part au backend : filtrer en local ne verrait que les 50 derniers
  // échanges, et afficherait "aucun échange" alors que des erreurs plus anciennes existent.
  const load = useCallback(() => {
    setLoadError(null);
    const succes = filtre === "tous" ? undefined : filtre === "ok";
    Promise.all([api.admin.llmStats(), api.admin.llmExchanges({ succes })])
      .then(([s, e]) => { setStats(s); setEchanges(e); })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [filtre]);

  useEffect(() => { load(); }, [load]);

  // EchangesLlm attend un loader stable, sinon son effet reboucle à chaque rendu.
  const loadDetail = useCallback(
    () => (selected ? api.admin.llmExchange(selected.id).then((e) => [e]) : Promise.resolve([])),
    [selected],
  );

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div className="page-shell">
        <ListPageHeader
          eyebrow="Supervision"
          title="Analyses IA"
          subtitle="Historique des appels au modèle d'extraction, tous comptes confondus"
        />

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        {stats && stats.total > 0 && (
          <StatGrid stats={[
            { label: "Appels", value: String(stats.total), color: "var(--nm-text-secondary)" },
            { label: "Taux de succès", value: `${Math.round(stats.tauxSucces * 100)} %`, color: stats.echecs > 0 ? "var(--nm-warning)" : "var(--nm-success)" },
            { label: "Échecs", value: String(stats.echecs), color: stats.echecs > 0 ? "var(--nm-danger)" : "var(--nm-text-secondary)" },
            { label: "Durée moyenne", value: `${(stats.dureeMoyenneMs / 1000).toFixed(1)} s`, color: "var(--nm-text-secondary)", small: true },
            { label: "Durée p95", value: `${(stats.dureeP95Ms / 1000).toFixed(1)} s`, color: "var(--nm-text-secondary)", small: true },
          ]} />
        )}

        {stats && stats.parModele.length > 0 && (
          <div className="nm-card" style={{ padding: "16px 20px", marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: "var(--nm-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 12 }}>Par modèle</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.parModele.map((m) => (
                <div key={m.modele} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                  <span style={{ color: "var(--nm-text-secondary)", fontWeight: 500, wordBreak: "break-all" }}>{m.modele}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 11, color: "var(--nm-text-muted)" }}>
                    {m.total} appel{m.total > 1 ? "s" : ""} · {(m.dureeMoyenneMs / 1000).toFixed(1)} s
                    {m.echecs > 0 && <span style={{ color: "var(--nm-danger)" }}> · {m.echecs} échec{m.echecs > 1 ? "s" : ""}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {([["tous", "Tous"], ["ok", "Réussis"], ["erreur", "En erreur"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFiltre(val)}
              className="touch-target"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "7px 15px", borderRadius: "var(--nm-radius-pill)", fontSize: 12, fontFamily: "inherit",
                border: "1px solid " + (filtre === val ? "transparent" : "var(--nm-border-strong)"),
                background: filtre === val ? "var(--nm-accent)" : "transparent",
                color: filtre === val ? "var(--nm-text-on-accent)" : "var(--nm-text-muted)",
                fontWeight: filtre === val ? 600 : 400, cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <ListTable
          columns={COLUMNS}
          rows={echanges}
          rowKey={(e) => e.id}
          onRowClick={(e) => setSelected(e)}
          emptyLabel="Aucun échange enregistré"
          renderRow={(e) => (
            <>
              <div style={{ padding: "13px 12px 13px 0" }}>
                <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700, fontFamily: "monospace", background: e.succes ? "var(--nm-success-bg)" : "var(--nm-danger-bg)", color: e.succes ? "var(--nm-success)" : "var(--nm-danger)" }}>
                  {e.succes ? "OK" : "ERREUR"}
                </span>
              </div>
              <div style={{ padding: "13px 12px", fontSize: 12, color: "var(--nm-text-muted)", whiteSpace: "nowrap" }}>
                {e.typeDocument} #{e.documentId}
              </div>
              <div className="tc-hide-mobile" style={{ padding: "13px 12px", fontSize: 12, color: "var(--nm-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.modele}</div>
              <div className="tc-hide-mobile" style={{ padding: "13px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--nm-text-muted)" }}>{e.nbImages}</div>
              <div style={{ padding: "13px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: "var(--nm-text-muted)" }}>{(e.dureeMs / 1000).toFixed(1)} s</div>
              <div style={{ padding: "13px 12px", fontSize: 11, color: "var(--nm-text-faint)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{new Date(e.createdAt).toLocaleString("fr-FR")}</div>
              <div style={{ padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--nm-text-faint)" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </>
          )}
        />
        </>}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)} width={760} titleId="admin-llm-title">
          <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid var(--nm-border)", flexShrink: 0 }}>
            <div id="admin-llm-title" style={{ fontSize: 16, fontWeight: 700 }}>
              {selected.typeDocument} #{selected.documentId} — lot {selected.batch}
            </div>
            <div style={{ fontSize: 12, color: "var(--nm-text-muted)", marginTop: 4, wordBreak: "break-all" }}>{selected.modele}</div>
          </div>
          <div style={{ padding: "18px 28px", overflowY: "auto" }}>
            <EchangesLlm load={loadDetail} />
          </div>
          <div style={{ padding: "14px 28px", borderTop: "1px solid var(--nm-border)", display: "flex", justifyContent: "flex-end", flexShrink: 0, background: "var(--nm-base-raised)" }}>
            <button onClick={() => setSelected(null)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid var(--nm-border-strong)", borderRadius: 7, color: "var(--nm-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
