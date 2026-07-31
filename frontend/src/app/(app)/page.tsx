"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { formatDateLong, formatEurCompact, formatEurRounded } from "@/lib/format";
import { DevisDto, FactureDto, TYPE_LOT_LABELS, TYPE_LOT_VALUES } from "@/lib/types";

const LOTS_ORDER = TYPE_LOT_VALUES.map((t) => TYPE_LOT_LABELS[t]);
const fmtEur = formatEurRounded;
const fmtK = formatEurCompact;
const fmtDate = formatDateLong;

export default function Dashboard() {
  const [devis, setDevis] = useState<DevisDto[]>([]);
  const [factures, setFactures] = useState<FactureDto[]>([]);
  const [lmOk, setLmOk] = useState<boolean | null>(null);
  const [providerName, setProviderName] = useState("LM Studio");
  const donutRef = useRef<SVGCircleElement>(null);
  const budgetBarRef = useRef<HTMLDivElement>(null);
  const lotBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    Promise.all([api.devis.list(), api.factures.list()])
      .then(([d, f]) => {
        setDevis(d);
        setFactures(f);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.settings.test().then((r) => setLmOk(r.success)).catch(() => setLmOk(false));
    api.settings.get()
      .then((s) => setProviderName(s.lmStudio.baseUrl.includes("openrouter") ? "OpenRouter" : "LM Studio"))
      .catch(() => {});
  }, []);

  // KPI derivations
  const budgetPrevu = devis.reduce((s, d) => s + (d.totalTtc ?? 0), 0);
  const budgetEngage = factures.reduce((s, f) => s + (f.totalTtc ?? 0), 0);
  const pct = budgetPrevu > 0 ? budgetEngage / budgetPrevu : 0;
  const pctDisplay = Math.round(pct * 100);

  const facturesEnAttente = factures.filter((f) => f.statut === "EnAttente").length;
  const facturesExtrait = factures.filter((f) => f.statut === "Extrait").length;
  const conformite = factures.length > 0 ? Math.round((facturesExtrait / factures.length) * 100) : 0;

  // Lots from devis — regroupés par TypeLot (classification standardisée du LLM), pas par le champ libre `lot`
  const lotsMap: Record<string, { prevu: number; engage: number }> = {};
  for (const d of devis) {
    const lot = d.typeLot ? TYPE_LOT_LABELS[d.typeLot] : "Divers / Imprévus";
    if (!lotsMap[lot]) lotsMap[lot] = { prevu: 0, engage: 0 };
    lotsMap[lot].prevu += d.totalTtc ?? 0;
  }
  for (const f of factures) {
    // priorité au typeLot de la facture elle-même, sinon celui du devis lié
    const linked = f.devisId ? devis.find((d) => d.id === f.devisId) : undefined;
    const typeLot = f.typeLot ?? linked?.typeLot;
    const lot = typeLot ? TYPE_LOT_LABELS[typeLot] : "Divers / Imprévus";
    if (!lotsMap[lot]) lotsMap[lot] = { prevu: 0, engage: 0 };
    lotsMap[lot].engage += f.totalTtc ?? 0;
  }

  const lots = (Object.keys(lotsMap).length > 0
    ? Object.entries(lotsMap).map(([name, { prevu, engage }]) => {
        const p = prevu > 0 ? Math.min(Math.round((engage / prevu) * 100), 100) : 0;
        return { name, prevu, engage, pct: p };
      }).sort((a, b) => b.prevu - a.prevu)
    : LOTS_ORDER.slice(0, 6).map((name) => ({ name, prevu: 0, engage: 0, pct: 0 }))
  );

  // Recent docs
  const recentDocs = [
    ...devis.map((d) => ({ _type: "DEV" as const, _date: d.createdAt, d, f: null })),
    ...factures.map((f) => ({ _type: "FAC" as const, _date: f.createdAt, d: null, f })),
  ]
    .sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())
    .slice(0, 5);

  // Animate after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (donutRef.current) {
        const circumference = 2 * Math.PI * 80;
        donutRef.current.style.strokeDashoffset = String(circumference * (1 - pct));
      }
      if (budgetBarRef.current) budgetBarRef.current.style.width = pctDisplay + "%";
      lotBarsRef.current.forEach((bar, i) => {
        if (!bar || !lots[i]) return;
        bar.style.background = lots[i].pct >= 100 ? "#4ADE80" : lots[i].pct === 0 ? "#383838" : "#F97316";
        bar.style.width = lots[i].pct + "%";
      });
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis, factures]);

  return (
    <div style={{ fontFamily: "inherit" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        * { box-sizing: border-box; }
      `}</style>

      {/* PAGE BODY */}
      <div style={{ minHeight: "calc(100vh - 52px)", padding: "32px 40px 56px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, animation: "fadeUp 0.5s 0.05s ease both" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "#F97316", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8 }}>Tableau de bord · Chantier</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#F0EDE8", letterSpacing: "-0.01em" }}>Maison individuelle — Construction neuve</h1>
            <div style={{ fontSize: 13, color: "#888480", marginTop: 5 }}>
              {devis.length + factures.length > 0
                ? `${devis.length + factures.length} documents · ${devis.length} devis · ${factures.length} factures`
                : "Aucun document importé"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1F1F1F", border: "1px solid #2C2C2C", borderRadius: 6, padding: "6px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: lmOk ? "#4ADE80" : lmOk === false ? "#F87171" : "#888480", boxShadow: lmOk ? "0 0 5px #4ADE8088" : "none" }} />
              <span style={{ fontSize: 12, color: "#A09C98" }}>{providerName} {lmOk === null ? "…" : lmOk ? "connecté" : "déconnecté"}</span>
            </div>
            <div style={{ background: "#1F1F1F", border: "1px solid #2C2C2C", borderRadius: 8, padding: "8px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#888480", letterSpacing: "0.1em", textTransform: "uppercase" }}>Début chantier</div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-jetbrains-mono)", color: "#C0BDB8", marginTop: 2 }}>Mars 2026</div>
            </div>
            <div style={{ background: "#1F1F1F", border: "1px solid #2C2C2C", borderRadius: 8, padding: "8px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#888480", letterSpacing: "0.1em", textTransform: "uppercase" }}>Livraison estimée</div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-jetbrains-mono)", color: "#C0BDB8", marginTop: 2 }}>Déc. 2026</div>
            </div>
          </div>
        </div>

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <KpiCard delay="0.1s" title="Budget prévu" value={budgetPrevu > 0 ? fmtEur(budgetPrevu) : "—"} sub={`${devis.length} devis contractuels`} />
          <div style={{ background: "#222", border: "1px solid #303030", borderRadius: 10, padding: "20px 22px", animation: "fadeUp 0.5s 0.15s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>Engagé</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "#F97316", letterSpacing: "-0.02em" }}>{budgetEngage > 0 ? fmtEur(budgetEngage) : "—"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1, height: 3, background: "#303030", borderRadius: 2, overflow: "hidden" }}>
                <div ref={budgetBarRef} style={{ width: "0%", height: "100%", background: "#F97316", borderRadius: 2, transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", color: "#F97316" }}>{pctDisplay}%</span>
            </div>
          </div>
          <KpiCard delay="0.2s" title="Documents" value={null} sub="">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <div><div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "#F0EDE8" }}>{devis.length}</div><div style={{ fontSize: 11, color: "#888480", marginTop: 4 }}>Devis</div></div>
              <div style={{ width: 1, height: 32, background: "#303030", marginBottom: 4 }} />
              <div><div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "#F0EDE8" }}>{factures.length}</div><div style={{ fontSize: 11, color: "#888480", marginTop: 4 }}>Factures</div></div>
            </div>
          </KpiCard>
          <div style={{ background: "#222", border: "1px solid #303030", borderTop: "2px solid #F59E0B", borderRadius: 10, padding: "20px 22px", animation: "fadeUp 0.5s 0.25s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>En attente</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "#FCD34D" }}>{facturesEnAttente}</div>
            <div style={{ fontSize: 11, color: "#888480", marginTop: 7 }}>Factures à rapprocher</div>
          </div>
          <div style={{ background: "#222", border: "1px solid #303030", borderTop: "2px solid #4ADE80", borderRadius: 10, padding: "20px 22px", animation: "fadeUp 0.5s 0.3s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>Conformité</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "#4ADE80" }}>{conformite}%</div>
            <div style={{ fontSize: 11, color: "#888480", marginTop: 7 }}>Devis → Factures</div>
          </div>
        </div>

        {/* MAIN: Donut + Lots */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) minmax(320px, 1fr)", gap: 16, marginBottom: 16 }}>
          {/* DONUT */}
          <div style={{ background: "#222", border: "1px solid #303030", borderRadius: 10, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeUp 0.5s 0.35s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", alignSelf: "flex-start", marginBottom: 20 }}>Avancement global</div>
            <div style={{ position: "relative", width: 180, height: 180 }}>
              <svg width="180" height="180" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="80" fill="none" stroke="#2E2E2E" strokeWidth="16" />
                <circle ref={donutRef} cx="96" cy="96" r="80" fill="none" stroke="#F97316" strokeWidth="16"
                  strokeLinecap="round"
                  style={{ strokeDasharray: "502.65", strokeDashoffset: "502.65", transform: "rotate(-90deg)", transformOrigin: "96px 96px", transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 34, fontWeight: 700, color: "#F0EDE8", letterSpacing: "-0.02em" }}>{pctDisplay}%</div>
                <div style={{ fontSize: 11, color: "#888480", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>réalisé</div>
              </div>
            </div>
            <div style={{ width: "100%", marginTop: 22, display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#F97316", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#A09C98" }}>Engagé</span>
                </div>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: "#F97316" }}>{budgetEngage > 0 ? fmtEur(budgetEngage) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#303030", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#A09C98" }}>Restant</span>
                </div>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: "#888480" }}>{budgetPrevu > 0 ? fmtEur(Math.max(0, budgetPrevu - budgetEngage)) : "—"}</span>
              </div>
              <div style={{ height: 1, background: "#2C2C2C", margin: "2px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888480" }}>Total prévu</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: "#C0BDB8" }}>{budgetPrevu > 0 ? fmtEur(budgetPrevu) : "—"}</span>
              </div>
            </div>
          </div>

          {/* LOTS */}
          <div style={{ background: "#222", border: "1px solid #303030", borderRadius: 10, padding: "28px 28px", animation: "fadeUp 0.5s 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)" }}>Budget par lot</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[["#4ADE80", "Terminé"], ["#F97316", "En cours"], ["#303030", "À venir"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 3, borderRadius: 2, background: c }} />
                    <span style={{ fontSize: 10, color: "#888480" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {lots.map((lot, i) => {
                const pctColor = lot.pct >= 100 ? "#4ADE80" : lot.pct === 0 ? "#555250" : "#F97316";
                return (
                  <div key={lot.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "#C0BDB8", fontWeight: 500 }}>{lot.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", color: "#888480" }}>
                          {lot.engage > 0 ? fmtK(lot.engage) : "—"} / {lot.prevu > 0 ? fmtK(lot.prevu) : "—"}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", minWidth: 32, textAlign: "right", color: pctColor }}>{lot.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#2A2A2A", borderRadius: 3, overflow: "hidden" }}>
                      <div ref={(el) => { lotBarsRef.current[i] = el; }} style={{ height: "100%", width: "0%", borderRadius: 3, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)", background: "#F97316" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RECENT DOCS */}
        <div style={{ background: "#222", border: "1px solid #303030", borderRadius: 10, padding: "24px 28px", animation: "fadeUp 0.5s 0.45s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)" }}>Documents récents</div>
            <Link href="/factures" style={{ fontSize: 12, color: "#F97316", textDecoration: "none", fontWeight: 500 }}>Voir tout →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 120px 100px", gap: 16, paddingBottom: 10, borderBottom: "1px solid #2C2C2C", marginBottom: 2 }}>
            <div />
            {["Document", "Lot", "Montant", "Statut"].map((h, i) => (
              <div key={h} style={{ fontSize: 10, letterSpacing: "0.1em", color: "#666260", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", textAlign: i >= 2 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {recentDocs.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#555250", fontSize: 13 }}>
              Aucun document importé.{" "}
              <Link href="/devis/import" style={{ color: "#F97316", textDecoration: "none" }}>Importer un devis</Link>
            </div>
          )}
          {recentDocs.map((item, i) => {
            const isDevis = item._type === "DEV";
            const doc = isDevis ? item.d! : item.f!;
            const typeLot = isDevis
              ? item.d!.typeLot
              : (item.f!.typeLot ?? (item.f!.devisId ? devis.find((d) => d.id === item.f!.devisId)?.typeLot : undefined));
            const lot = typeLot ? TYPE_LOT_LABELS[typeLot] : "—";
            const montant = doc.totalTtc ? fmtEur(doc.totalTtc) : "—";
            const name = isDevis
              ? `${item.d!.entreprise?.nom ?? "Devis"} — ${item.d!.numeroDevis ?? "#" + item.d!.id}`
              : `${item.f!.entreprise?.nom ?? "Facture"} — ${item.f!.numeroFacture ?? "#" + item.f!.id}`;
            const statut = doc.statut === "EnAttente" ? "EN ATTENTE" : doc.statut === "Extrait" ? "EXTRAIT" : "ERREUR";
            const [iconBg, iconColor] =
              doc.statut === "Extrait" ? ["#162216", "#4ADE80"] :
              doc.statut === "Erreur" ? ["#221212", "#F87171"] :
              ["#231D0C", "#FCD34D"];
            const href = isDevis ? `/devis/${doc.id}` : `/factures/${doc.id}`;

            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 120px 100px", gap: 16, alignItems: "center", padding: "11px 0", borderBottom: "1px solid #262626" }}>
                <div style={{ width: 34, height: 34, borderRadius: 7, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", fontWeight: 700, color: iconColor, letterSpacing: "0.05em" }}>{item._type}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <Link href={href} style={{ fontSize: 13, color: "#E8E5E2", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", textDecoration: "none" }}>{name}</Link>
                  <div style={{ fontSize: 11, color: "#888480", marginTop: 2 }}>{fmtDate(item._date)}</div>
                </div>
                <div style={{ fontSize: 12, color: "#A09C98", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lot}</div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, color: "#C0BDB8", textAlign: "right" }}>{montant}</div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "var(--font-jetbrains-mono)", background: iconBg, color: iconColor }}>{statut}</span>
                </div>
              </div>
            );
          })}
        </div>
        </>}
      </div>
    </div>
  );
}

function KpiCard({ delay, title, value, sub, children }: {
  delay: string; title: string; value: string | null; sub: string; children?: React.ReactNode;
}) {
  return (
    <div style={{ background: "#222", border: "1px solid #303030", borderRadius: 10, padding: "20px 22px", animation: `fadeUp 0.5s ${delay} ease both` }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>{title}</div>
      {children ?? (
        <>
          <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "#F0EDE8", letterSpacing: "-0.02em" }}>{value}</div>
          <div style={{ fontSize: 11, color: "#888480", marginTop: 7 }}>{sub}</div>
        </>
      )}
    </div>
  );
}
