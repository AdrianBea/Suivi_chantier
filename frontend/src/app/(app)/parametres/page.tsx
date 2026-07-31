"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TestResultDto } from "@/lib/types";

const CARD: React.CSSProperties = { background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: "28px 28px" };
const LABEL: React.CSSProperties = { fontSize: 11, color: "var(--nm-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8, display: "block" };
const INPUT: React.CSSProperties = { width: "100%", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "var(--font-jetbrains-mono)" };

export default function ParametresPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<TestResultDto | null>(null);

  useEffect(() => {
    api.settings.get()
      .then((s) => {
        setApiKey(s.apiKey);
        setModel(s.model);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Impossible de joindre le backend"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setSaveError(null); setSaveSuccess(false); setTestResult(null);
    try {
      await api.settings.update(model);
      setSaveSuccess(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  }

  async function handleRefreshModels() {
    setLoadingModels(true); setModelsError(null);
    try {
      const data = await api.settings.getModels();
      setModels(data.models);
      if (data.models.length > 0 && !data.models.includes(model)) setModel(data.models[0]);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Impossible de récupérer les modèles");
    } finally { setLoadingModels(false); }
  }

  async function handleReset() {
    if (!confirm("Supprimer TOUS les devis, factures et entreprises ? Cette action est irréversible.")) return;
    setResetting(true); setResetResult(null);
    try {
      await api.settings.reset();
      setResetResult({ success: true, message: "Base réinitialisée." });
    } catch (e) {
      setResetResult({ success: false, message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally { setResetting(false); }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
    try {
      setTestResult(await api.settings.test());
    } catch (e) {
      setTestResult({ success: false, message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally { setTesting(false); }
  }

  const body = (
    <div style={{ fontFamily: "inherit" }}>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} } *{box-sizing:border-box}`}</style>

      {/* BODY */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 40px 64px" }}>
        <div style={{ marginBottom: 28, animation: "fadeUp 0.5s 0.05s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--nm-accent)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8 }}>Configuration · Le Point Travaux</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "-0.01em" }}>Paramètres</h1>
          <p style={{ fontSize: 13, color: "var(--nm-text-muted)", marginTop: 5 }}>Connexion OpenRouter</p>
        </div>

        {/* Warning */}
        <div style={{ background: "var(--nm-accent-soft-bg)", border: "1px solid var(--nm-accent-soft-bg)", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 12, color: "var(--nm-accent-soft-text)", animation: "fadeUp 0.5s 0.1s ease both" }}>
          Les modifications prennent effet immédiatement, sans redémarrage du serveur. La clé API n&apos;est plus modifiable depuis cette page ; changez-la dans <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>backend/.env</code> puis redémarrez le backend.
        </div>

        {/* OpenRouter */}
        <div style={{ ...CARD, marginBottom: 28, animation: "fadeUp 0.5s 0.15s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 22 }}>Fournisseur LLM</div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="param-apikey" style={LABEL}>Clé API</label>
            <input id="param-apikey" style={{ ...INPUT, color: "var(--nm-text-muted)", cursor: "not-allowed" }} type="text" value={apiKey} readOnly disabled />
            <p style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: 6 }}>Non modifiable ici — définie dans <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>backend/.env</code>.</p>
          </div>

          <div>
            <label htmlFor="param-model" style={LABEL}>Modèle actif</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                id="param-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ ...INPUT, flex: 1, cursor: "pointer" }}
              >
                {model && !models.includes(model) && <option value={model}>{model}</option>}
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
                {models.length === 0 && !model && <option value="" disabled>— charger la liste —</option>}
              </select>
              <Btn onClick={handleRefreshModels} disabled={loadingModels}>{loadingModels ? "…" : "↻ Rafraîchir"}</Btn>
              <Btn onClick={handleTest} disabled={testing}>{testing ? "Test…" : "Tester"}</Btn>
            </div>
            {modelsError && <p style={{ fontSize: 11, color: "var(--nm-danger)", marginTop: 6 }}>{modelsError}</p>}
            {testResult && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", background: testResult.success ? "var(--nm-success-bg)" : "var(--nm-danger-bg)", border: `1px solid ${testResult.success ? "var(--nm-success)" : "var(--nm-danger-border)"}`, color: testResult.success ? "var(--nm-success)" : "var(--nm-danger)" }}>
                {testResult.success ? "✓ " : "✗ "}{testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, animation: "fadeUp 0.5s 0.25s ease both" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "10px 24px", background: saving ? "var(--nm-accent-hover)" : "var(--nm-accent)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--nm-text-on-accent)", cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saveSuccess && <span style={{ fontSize: 12, color: "var(--nm-success)", fontFamily: "var(--font-jetbrains-mono)" }}>✓ Paramètres sauvegardés</span>}
          {saveError && <span style={{ fontSize: 12, color: "var(--nm-danger)", fontFamily: "var(--font-jetbrains-mono)" }}>✗ {saveError}</span>}
        </div>

        {/* Zone dangereuse */}
        <div style={{ ...CARD, marginTop: 28, borderColor: "var(--nm-danger-border)", animation: "fadeUp 0.5s 0.3s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-danger)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>Zone dangereuse</div>
          <p style={{ fontSize: 12, color: "var(--nm-text-muted)", marginBottom: 16 }}>Supprime définitivement tous les devis, factures et entreprises. La configuration est conservée.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{ padding: "10px 24px", background: resetting ? "var(--nm-danger-border)" : "var(--nm-danger-bg)", border: "1px solid var(--nm-danger)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--nm-text-on-accent)", cursor: resetting ? "not-allowed" : "pointer" }}
            >
              {resetting ? "Suppression…" : "RAZ toute la base"}
            </button>
            {resetResult && (
              <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: resetResult.success ? "var(--nm-success)" : "var(--nm-danger)" }}>
                {resetResult.success ? "✓ " : "✗ "}{resetResult.message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ background: "var(--nm-base)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 13, color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)" }}>Chargement…</span>
    </div>
  );

  if (loadError) return (
    <div style={{ background: "var(--nm-base)", minHeight: "100vh", padding: "40px", color: "var(--nm-text-primary)" }}>
      <Link href="/" style={{ fontSize: 13, color: "var(--nm-accent)", textDecoration: "none" }}>← Accueil</Link>
      <div style={{ marginTop: 20, padding: "14px 18px", background: "var(--nm-danger-bg)", border: "1px solid var(--nm-danger-border)", borderRadius: 8, fontSize: 13, color: "var(--nm-danger)" }}>
        Impossible de joindre le backend : {loadError}. Vérifiez que le serveur est démarré (<code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>dotnet run</code> dans <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>backend/</code>).
      </div>
    </div>
  );

  return body;
}

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "9px 14px", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, fontSize: 12, color: disabled ? "var(--nm-text-disabled)" : "var(--nm-text-tertiary)", fontFamily: "var(--font-jetbrains-mono)", cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
    >
      {children}
    </button>
  );
}
