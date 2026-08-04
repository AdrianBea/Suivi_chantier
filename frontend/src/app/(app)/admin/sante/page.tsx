"use client";

import { useEffect, useState } from "react";
import { ListPageHeader } from "@/components/ListPageHeader";
import { ErrorState, LoadState } from "@/components/LoadState";
import { api } from "@/lib/api";
import { formatTaille } from "@/lib/format";
import { HealthDto, OpenRouterSettingsDto, TestResultDto } from "@/lib/types";

const CARD: React.CSSProperties = {
  padding: "20px 24px",
  marginBottom: 18,
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: 10,
  color: "var(--nm-text-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontFamily: "monospace",
  marginBottom: 16,
};

const LIGNE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "9px 0",
  borderBottom: "1px solid var(--nm-border)",
  fontSize: 13,
  flexWrap: "wrap",
};

export default function AdminSantePage() {
  const [health, setHealth] = useState<HealthDto | null>(null);
  const [settings, setSettings] = useState<OpenRouterSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [test, setTest] = useState<TestResultDto | null>(null);
  const [testing, setTesting] = useState(false);

  function load() {
    setLoadError(null);
    Promise.all([api.admin.health(), api.settings.get()])
      .then(([h, s]) => { setHealth(h); setSettings(s); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Jusqu'à 30 s d'attente côté OpenRouter : déclenchement manuel uniquement.
  async function lancerTest() {
    setTesting(true);
    setTest(null);
    try {
      setTest(await api.settings.test());
    } catch (e) {
      setTest({ success: false, message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setTesting(false);
    }
  }

  const enErreur = (health?.devisEnErreur ?? 0) + (health?.facturesEnErreur ?? 0);

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div className="page-shell page-shell-narrow">
        <ListPageHeader
          eyebrow="Supervision"
          title="Santé"
          subtitle="État du serveur, de la base et du service d'analyse"
        />

        {loadError && <div style={{ marginBottom: 22 }}><ErrorState message={loadError} onRetry={load} /></div>}
        {loading ? <LoadState /> : health && <>

        <div className="nm-card" style={CARD}>
          <div style={CARD_TITLE}>Serveur</div>
          <Ligne label="Base de données">
            <Pastille ok={health.dbConnectee} texte={health.dbConnectee ? "Connectée" : "Injoignable"} />
          </Ligne>
          <Ligne label="Version">{health.version}</Ligne>
          <Ligne label="En ligne depuis" derniere>
            {health.uptimeHeures < 1 ? "moins d'une heure" : `${health.uptimeHeures} h`}
          </Ligne>
        </div>

        <div className="nm-card" style={CARD}>
          <div style={CARD_TITLE}>Données</div>
          <Ligne label="Comptes">{health.nbUtilisateurs}</Ligne>
          <Ligne label="Documents stockés (PDF et pièces jointes)">{formatTaille(health.octetsPdfStockes)}</Ligne>
          <Ligne label="Taille totale de la base" derniere={enErreur === 0}>
            {health.tailleBaseOctets > 0 ? formatTaille(health.tailleBaseOctets) : "non disponible"}
          </Ligne>
          {enErreur > 0 && (
            <Ligne label="Extractions en échec" derniere>
              <span style={{ color: "var(--nm-danger)", fontWeight: 600 }}>
                {health.devisEnErreur} devis, {health.facturesEnErreur} factures
              </span>
            </Ligne>
          )}
        </div>

        <div className="nm-card" style={CARD}>
          <div style={CARD_TITLE}>Analyse automatique des documents</div>
          <Ligne label="Modèle">{settings?.model ?? "—"}</Ligne>
          <Ligne label="Clé d'API" derniere>{settings?.apiKey || "non configurée"}</Ligne>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
            <button
              onClick={lancerTest}
              disabled={testing}
              className="nm-btn touch-target"
              style={{ padding: "9px 18px", fontSize: 13, fontFamily: "inherit", cursor: testing ? "not-allowed" : "pointer", opacity: testing ? 0.6 : 1 }}
            >
              {testing ? "Test en cours…" : "Tester la connexion"}
            </button>
            {test && (
              <span style={{ fontSize: 12, color: test.success ? "var(--nm-success)" : "var(--nm-danger)", wordBreak: "break-word", flex: "1 1 200px" }}>
                {test.success ? "✓" : "✗"} {test.message}
              </span>
            )}
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}

function Ligne({ label, children, derniere }: { label: string; children: React.ReactNode; derniere?: boolean }) {
  return (
    <div style={derniere ? { ...LIGNE, borderBottom: "none" } : LIGNE}>
      <span style={{ color: "var(--nm-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--nm-text-secondary)", fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 12, textAlign: "right", wordBreak: "break-all" }}>{children}</span>
    </div>
  );
}

function Pastille({ ok, texte }: { ok: boolean; texte: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: ok ? "var(--nm-success)" : "var(--nm-danger)", fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }} />
      {texte}
    </span>
  );
}
