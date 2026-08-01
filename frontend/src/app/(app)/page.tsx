"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { formatDateLong, formatEurCompact, formatEurRounded } from "@/lib/format";
import { DevisDto, FactureDto, TYPE_LOT_LABELS, TYPE_LOT_VALUES, UserDto } from "@/lib/types";
import { useParallax } from "@/lib/useParallax";

const LOTS_ORDER = TYPE_LOT_VALUES.map((t) => TYPE_LOT_LABELS[t]);
const fmtEur = formatEurRounded;
const fmtK = formatEurCompact;
const fmtDate = formatDateLong;

export default function Dashboard() {
  const [devis, setDevis] = useState<DevisDto[]>([]);
  const [factures, setFactures] = useState<FactureDto[]>([]);
  const [lmOk, setLmOk] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const donutRef = useRef<SVGCircleElement>(null);
  const budgetBarRef = useRef<HTMLDivElement>(null);
  const lotBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const heroRef = useParallax<HTMLDivElement>();

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
    api.auth.me().then((u) => {
      setUser(u);
      if (u.isAdmin) api.settings.test().then((r) => setLmOk(r.success)).catch(() => setLmOk(false));
    }).catch(() => setUser(null));
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
        bar.style.background = lots[i].pct >= 100 ? "var(--nm-success)" : lots[i].pct === 0 ? "var(--nm-border-strong)" : "var(--nm-accent)";
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
        <div ref={heroRef} className="parallax-layer" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, animation: "fadeUp 0.5s 0.05s ease both" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--nm-accent)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8 }}>Tableau de bord · Le Point Travaux</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "-0.01em" }}>{user?.adresse || "Maison individuelle — Construction neuve"}</h1>
            <div style={{ fontSize: 13, color: "var(--nm-text-muted)", marginTop: 5 }}>
              {(user?.nom || user?.prenom) && `${user.prenom ?? ""} ${user.nom ?? ""}`.trim() + " · "}
              {devis.length + factures.length > 0
                ? `${devis.length + factures.length} documents · ${devis.length} devis · ${factures.length} factures`
                : "Aucun document importé"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user?.isAdmin && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--nm-base-raised)", border: "1px solid var(--nm-border)", borderRadius: 6, padding: "6px 12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: lmOk ? "var(--nm-success)" : lmOk === false ? "var(--nm-danger)" : "var(--nm-text-muted)", boxShadow: lmOk ? "0 0 6px 1px color-mix(in srgb, var(--nm-success) 55%, transparent)" : "none" }} />
                <span style={{ fontSize: 12, color: "var(--nm-text-muted)" }}>OpenRouter {lmOk === null ? "…" : lmOk ? "connecté" : "déconnecté"}</span>
              </div>
            )}
            <div style={{ background: "var(--nm-base-raised)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "8px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--nm-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Début chantier</div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-text-tertiary)", marginTop: 2 }}>{user?.dateDebutChantier ? fmtDate(user.dateDebutChantier) : "—"}</div>
            </div>
            <div style={{ background: "var(--nm-base-raised)", border: "1px solid var(--nm-border)", borderRadius: 8, padding: "8px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--nm-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Livraison estimée</div>
              <div style={{ fontSize: 13, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-text-tertiary)", marginTop: 2 }}>{user?.dateLivraisonPrevue ? fmtDate(user.dateLivraisonPrevue) : "—"}</div>
            </div>
          </div>
        </div>

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : <>

        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <KpiCard delay="0.1s" title="Budget prévu" value={budgetPrevu > 0 ? fmtEur(budgetPrevu) : "—"} sub={`${devis.length} devis contractuels`} />
          <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: "20px 22px", animation: "fadeUp 0.5s 0.15s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>Engagé</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "var(--nm-accent)", letterSpacing: "-0.02em" }}>{budgetEngage > 0 ? fmtEur(budgetEngage) : "—"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1, height: 3, background: "var(--nm-border)", borderRadius: 2, overflow: "hidden" }}>
                <div ref={budgetBarRef} style={{ width: "0%", height: "100%", background: "var(--nm-accent)", borderRadius: 2, transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-accent)" }}>{pctDisplay}%</span>
            </div>
          </div>
          <KpiCard delay="0.2s" title="Documents" value={null} sub="">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <div><div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "var(--nm-text-primary)" }}>{devis.length}</div><div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 4 }}>Devis</div></div>
              <div style={{ width: 1, height: 32, background: "var(--nm-border)", marginBottom: 4 }} />
              <div><div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "var(--nm-text-primary)" }}>{factures.length}</div><div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 4 }}>Factures</div></div>
            </div>
          </KpiCard>
          <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-warning)", borderRadius: 10, padding: "20px 22px", animation: "fadeUp 0.5s 0.25s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>En attente</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "var(--nm-warning)" }}>{facturesEnAttente}</div>
            <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 7 }}>Factures à rapprocher</div>
          </div>
          <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderTop: "2px solid var(--nm-success)", borderRadius: 10, padding: "20px 22px", animation: "fadeUp 0.5s 0.3s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>Conformité</div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "var(--nm-success)" }}>{conformite}%</div>
            <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 7 }}>Devis → Factures</div>
          </div>
        </div>

        {/* MAIN: Donut + Lots */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) minmax(320px, 1fr)", gap: 16, marginBottom: 16 }}>
          {/* DONUT */}
          <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeUp 0.5s 0.35s ease both" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", alignSelf: "flex-start", marginBottom: 20 }}>Avancement global</div>
            <div style={{ position: "relative", width: 180, height: 180 }}>
              <svg width="180" height="180" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="80" fill="none" stroke="var(--nm-base-sunken)" strokeWidth="16" />
                <circle ref={donutRef} cx="96" cy="96" r="80" fill="none" stroke="var(--nm-accent)" strokeWidth="16"
                  strokeLinecap="round"
                  style={{ strokeDasharray: "502.65", strokeDashoffset: "502.65", transform: "rotate(-90deg)", transformOrigin: "96px 96px", transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 34, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "-0.02em" }}>{pctDisplay}%</div>
                <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>réalisé</div>
              </div>
            </div>
            <div style={{ width: "100%", marginTop: 22, display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--nm-accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--nm-text-muted)" }}>Engagé</span>
                </div>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-accent)" }}>{budgetEngage > 0 ? fmtEur(budgetEngage) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--nm-border)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--nm-text-muted)" }}>Restant</span>
                </div>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-text-muted)" }}>{budgetPrevu > 0 ? fmtEur(Math.max(0, budgetPrevu - budgetEngage)) : "—"}</span>
              </div>
              <div style={{ height: 1, background: "var(--nm-border)", margin: "2px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--nm-text-muted)" }}>Total prévu</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-text-tertiary)" }}>{budgetPrevu > 0 ? fmtEur(budgetPrevu) : "—"}</span>
              </div>
            </div>
          </div>

          {/* LOTS */}
          <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: "28px 28px", animation: "fadeUp 0.5s 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)" }}>Budget par lot</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[["var(--nm-success)", "Terminé"], ["var(--nm-accent)", "En cours"], ["var(--nm-border)", "À venir"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 3, borderRadius: 2, background: c }} />
                    <span style={{ fontSize: 10, color: "var(--nm-text-muted)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {lots.map((lot, i) => {
                const pctColor = lot.pct >= 100 ? "var(--nm-success)" : lot.pct === 0 ? "var(--nm-text-faint)" : "var(--nm-accent)";
                return (
                  <div key={lot.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "var(--nm-text-tertiary)", fontWeight: 500 }}>{lot.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nm-text-muted)" }}>
                          {lot.engage > 0 ? fmtK(lot.engage) : "—"} / {lot.prevu > 0 ? fmtK(lot.prevu) : "—"}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono)", minWidth: 32, textAlign: "right", color: pctColor }}>{lot.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "var(--nm-base-raised)", borderRadius: 3, overflow: "hidden" }}>
                      <div ref={(el) => { lotBarsRef.current[i] = el; }} style={{ height: "100%", width: "0%", borderRadius: 3, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)", background: "var(--nm-accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RECENT DOCS */}
        <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: "24px 28px", animation: "fadeUp 0.5s 0.45s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)" }}>Documents récents</div>
            <Link href="/factures" style={{ fontSize: 12, color: "var(--nm-accent)", textDecoration: "none", fontWeight: 500 }}>Voir tout →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 120px 100px", gap: 16, paddingBottom: 10, borderBottom: "1px solid var(--nm-border)", marginBottom: 2 }}>
            <div />
            {["Document", "Lot", "Montant", "Statut"].map((h, i) => (
              <div key={h} style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--nm-text-faint)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", textAlign: i >= 2 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {recentDocs.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--nm-text-faint)", fontSize: 13 }}>
              Aucun document importé.{" "}
              <Link href="/devis/import" style={{ color: "var(--nm-accent)", textDecoration: "none" }}>Importer un devis</Link>
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
              doc.statut === "Extrait" ? ["var(--nm-success-bg)", "var(--nm-success)"] :
              doc.statut === "Erreur" ? ["var(--nm-danger-bg)", "var(--nm-danger)"] :
              ["var(--nm-accent-soft-bg)", "var(--nm-warning)"];
            const href = isDevis ? `/devis/${doc.id}` : `/factures/${doc.id}`;

            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 120px 100px", gap: 16, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--nm-base-sunken)" }}>
                <div style={{ width: 34, height: 34, borderRadius: 7, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", fontWeight: 700, color: iconColor, letterSpacing: "0.05em" }}>{item._type}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <Link href={href} style={{ fontSize: 13, color: "var(--nm-text-secondary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", textDecoration: "none" }}>{name}</Link>
                  <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 2 }}>{fmtDate(item._date)}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--nm-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lot}</div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, color: "var(--nm-text-tertiary)", textAlign: "right" }}>{montant}</div>
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
    <div style={{ background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: "20px 22px", animation: `fadeUp 0.5s ${delay} ease both` }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>{title}</div>
      {children ?? (
        <>
          <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 24, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "-0.02em" }}>{value}</div>
          <div style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 7 }}>{sub}</div>
        </>
      )}
    </div>
  );
}
