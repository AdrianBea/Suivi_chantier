"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TestResultDto } from "@/lib/types";

const CARD: React.CSSProperties = { background: "#222", border: "1px solid #303030", borderRadius: 10, padding: "28px 28px" };
const LABEL: React.CSSProperties = { fontSize: 11, color: "#888480", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8, display: "block" };
const INPUT: React.CSSProperties = { width: "100%", background: "#1A1A1A", border: "1px solid #333", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#E8E5E2", fontFamily: "var(--font-jetbrains-mono)" };

export default function ParametresPage() {
  const [provider, setProvider] = useState<"lmstudio" | "openrouter">("lmstudio");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultDto | null>(null);
  const [dbServer, setDbServer] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [testDbResult, setTestDbResult] = useState<TestResultDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<TestResultDto | null>(null);

  useEffect(() => {
    api.settings.get()
      .then((s) => {
        setBaseUrl(s.lmStudio.baseUrl);
        setApiKey(s.lmStudio.apiKey);
        setModel(s.lmStudio.model);
        setProvider(s.lmStudio.baseUrl.includes("openrouter") ? "openrouter" : "lmstudio");
        setDbServer(s.database.server);
        setDbName(s.database.database);
        setDbUser(s.database.user);
        setDbPassword(s.database.password);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Impossible de joindre le backend"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setSaveError(null); setSaveSuccess(false); setTestResult(null);
    try {
      await api.settings.update({ lmStudio: { baseUrl, model, apiKey }, database: { server: dbServer, database: dbName, user: dbUser, password: dbPassword } });
      setSaveSuccess(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  }

  const DEFAULT_URLS = { lmstudio: "http://localhost:1234/v1/", openrouter: "https://openrouter.ai/api/v1" };

  function handleProviderChange(next: "lmstudio" | "openrouter") {
    setProvider(next);
    // OpenRouter : URL fixe (champ masqué) -> toujours forcer, c'est ce qui marque le fournisseur au rechargement.
    // LM Studio : ne pré-remplir que si l'URL est vide ou l'URL OpenRouter, pour garder une IP custom.
    if (next === "openrouter") setBaseUrl(DEFAULT_URLS.openrouter);
    else if (!baseUrl.trim() || baseUrl.trim() === DEFAULT_URLS.openrouter) setBaseUrl(DEFAULT_URLS.lmstudio);
  }

  async function handleRefreshModels() {
    setLoadingModels(true); setModelsError(null);
    try {
      const data = await api.settings.getModels(baseUrl, apiKey);
      setModels(data.models);
      if (data.models.length > 0 && !data.models.includes(model)) setModel(data.models[0]);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Impossible de récupérer les modèles");
    } finally { setLoadingModels(false); }
  }

  async function handleTestDb() {
    setTestingDb(true); setTestDbResult(null);
    try {
      setTestDbResult(await api.settings.testDb());
    } catch (e) {
      setTestDbResult({ success: false, message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally { setTestingDb(false); }
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
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "#F97316", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8 }}>Configuration · Chantier</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#F0EDE8", letterSpacing: "-0.01em" }}>Paramètres</h1>
          <p style={{ fontSize: 13, color: "#888480", marginTop: 5 }}>Connexion LM Studio et base de données</p>
        </div>

        {/* Warning */}
        <div style={{ background: "#1E1A0E", border: "1px solid #3D3010", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 12, color: "#B8A060", animation: "fadeUp 0.5s 0.1s ease both" }}>
          Les modifications sont sauvegardées dans <code style={{ fontFamily: "var(--font-jetbrains-mono)", background: "#2A2210", padding: "1px 5px", borderRadius: 3 }}>appsettings.json</code> et prennent effet immédiatement, sans redémarrage du serveur.
        </div>

        {/* LM Studio */}
        <div style={{ ...CARD, marginBottom: 16, animation: "fadeUp 0.5s 0.15s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 22 }}>Fournisseur LLM</div>

          <div style={{ marginBottom: 18 }}>
            <label style={LABEL}>Fournisseur</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["lmstudio", "openrouter"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  style={{ flex: 1, padding: "9px 14px", background: provider === p ? "#F97316" : "#1A1A1A", border: `1px solid ${provider === p ? "#F97316" : "#333"}`, borderRadius: 7, fontSize: 12, fontWeight: provider === p ? 600 : 400, color: provider === p ? "#FFF" : "#C0BDB8", fontFamily: "var(--font-jetbrains-mono)", cursor: "pointer" }}
                >
                  {p === "lmstudio" ? "LM Studio (local)" : "OpenRouter (cloud)"}
                </button>
              ))}
            </div>
          </div>

          {provider === "lmstudio" && (
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="param-baseurl" style={LABEL}>URL de base</label>
              <input id="param-baseurl" style={INPUT} type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:1234/v1/" />
            </div>
          )}

          {provider === "openrouter" && (
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="param-apikey" style={LABEL}>Clé API</label>
              <input id="param-apikey" style={INPUT} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-v1-…" />
            </div>
          )}

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
            {modelsError && <p style={{ fontSize: 11, color: "#F87171", marginTop: 6 }}>{modelsError}</p>}
            {testResult && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", background: testResult.success ? "#162216" : "#221212", border: `1px solid ${testResult.success ? "#1E3820" : "#3A1818"}`, color: testResult.success ? "#4ADE80" : "#F87171" }}>
                {testResult.success ? "✓ " : "✗ "}{testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* BDD */}
        <div style={{ ...CARD, marginBottom: 28, animation: "fadeUp 0.5s 0.2s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888480", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 22 }}>Base de données — MySQL</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Serveur" id="param-dbserver"><input id="param-dbserver" style={INPUT} type="text" value={dbServer} onChange={(e) => setDbServer(e.target.value)} placeholder="localhost" /></Field>
            <Field label="Base de données" id="param-dbname"><input id="param-dbname" style={INPUT} type="text" value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="suivi_chantier" /></Field>
            <Field label="Utilisateur" id="param-dbuser"><input id="param-dbuser" style={INPUT} type="text" value={dbUser} onChange={(e) => setDbUser(e.target.value)} placeholder="admin" /></Field>
            <Field label="Mot de passe" id="param-dbpassword"><input id="param-dbpassword" style={INPUT} type="password" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} placeholder="••••••••" /></Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn onClick={handleTestDb} disabled={testingDb}>{testingDb ? "Test…" : "Tester la connexion"}</Btn>
            {testDbResult && (
              <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: testDbResult.success ? "#4ADE80" : "#F87171" }}>
                {testDbResult.success ? "✓ " : "✗ "}{testDbResult.message}
              </span>
            )}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, animation: "fadeUp 0.5s 0.25s ease both" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "10px 24px", background: saving ? "#7C3A10" : "#F97316", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#FFF", cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saveSuccess && <span style={{ fontSize: 12, color: "#4ADE80", fontFamily: "var(--font-jetbrains-mono)" }}>✓ Paramètres sauvegardés</span>}
          {saveError && <span style={{ fontSize: 12, color: "#F87171", fontFamily: "var(--font-jetbrains-mono)" }}>✗ {saveError}</span>}
        </div>

        {/* Zone dangereuse */}
        <div style={{ ...CARD, marginTop: 28, borderColor: "#3A1818", animation: "fadeUp 0.5s 0.3s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F87171", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 14 }}>Zone dangereuse</div>
          <p style={{ fontSize: 12, color: "#888480", marginBottom: 16 }}>Supprime définitivement tous les devis, factures et entreprises. La configuration est conservée.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{ padding: "10px 24px", background: resetting ? "#3A1818" : "#7F1D1D", border: "1px solid #B91C1C", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#FFF", cursor: resetting ? "not-allowed" : "pointer" }}
            >
              {resetting ? "Suppression…" : "RAZ toute la base"}
            </button>
            {resetResult && (
              <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains-mono)", color: resetResult.success ? "#4ADE80" : "#F87171" }}>
                {resetResult.success ? "✓ " : "✗ "}{resetResult.message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ background: "#1B1B1B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 13, color: "#888480", fontFamily: "var(--font-jetbrains-mono)" }}>Chargement…</span>
    </div>
  );

  if (loadError) return (
    <div style={{ background: "#1B1B1B", minHeight: "100vh", padding: "40px", color: "#F0EDE8" }}>
      <Link href="/" style={{ fontSize: 13, color: "#F97316", textDecoration: "none" }}>← Accueil</Link>
      <div style={{ marginTop: 20, padding: "14px 18px", background: "#221212", border: "1px solid #3A1818", borderRadius: 8, fontSize: 13, color: "#F87171" }}>
        Impossible de joindre le backend : {loadError}. Vérifiez que le serveur est démarré (<code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>dotnet run</code> dans <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>backend/</code>).
      </div>
    </div>
  );

  return body;
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 11, color: "#888480", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "9px 14px", background: "#1A1A1A", border: "1px solid #333", borderRadius: 7, fontSize: 12, color: disabled ? "#555" : "#C0BDB8", fontFamily: "var(--font-jetbrains-mono)", cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
    >
      {children}
    </button>
  );
}
