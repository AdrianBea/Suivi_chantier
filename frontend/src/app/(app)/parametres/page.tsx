"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TestResultDto, UserDto } from "@/lib/types";

const CARD_PAD = 28;
const SECTION_GAP = 28;
const FIELD_GAP = 20;
const LABEL_GAP = 8;
const FIELD_PAD = "10px 12px";

const CARD: React.CSSProperties = { background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: CARD_PAD };
const CARD_TITLE: React.CSSProperties = { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 22 };
const LABEL: React.CSSProperties = { fontSize: 11, color: "var(--nm-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "var(--font-jetbrains-mono)", marginBottom: LABEL_GAP, display: "block" };
const FIELD: React.CSSProperties = { width: "100%", background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", borderRadius: 7, padding: FIELD_PAD, fontSize: 13, color: "var(--nm-text-secondary)", fontFamily: "var(--font-jetbrains-mono)" };
const INPUT: React.CSSProperties = FIELD;
const BTN: React.CSSProperties = { padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" };
const RESULT_TEXT: React.CSSProperties = { fontSize: 12, fontFamily: "var(--font-jetbrains-mono)" };

export default function ParametresPage() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [dateDebutChantier, setDateDebutChantier] = useState("");
  const [dateLivraisonPrevue, setDateLivraisonPrevue] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<TestResultDto | null>(null);

  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultDto | null>(null);

  useEffect(() => {
    api.auth.me()
      .then((u) => {
        setUser(u);
        setNom(u.nom ?? "");
        setPrenom(u.prenom ?? "");
        setAdresse(u.adresse ?? "");
        setDateDebutChantier(u.dateDebutChantier ?? "");
        setDateLivraisonPrevue(u.dateLivraisonPrevue ?? "");
        if (u.isAdmin) {
          api.settings.get()
            .then((s) => setModel(s.model))
            .catch(() => {});
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Impossible de joindre le backend"))
      .finally(() => setLoading(false));
  }, []);

  async function handleTest() {
    setTesting(true); setTestResult(null);
    try {
      setTestResult(await api.settings.test());
    } catch (e) {
      setTestResult({ success: false, message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally { setTesting(false); }
  }

  async function handleSave() {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const updated = await api.auth.updateMe({
        nom: nom.trim() || null,
        prenom: prenom.trim() || null,
        adresse: adresse.trim() || null,
        dateDebutChantier: dateDebutChantier || null,
        dateLivraisonPrevue: dateLivraisonPrevue || null,
      });
      setUser(updated);
      setSaveSuccess(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
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

  const body = (
    <div style={{ fontFamily: "inherit" }}>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} } *{box-sizing:border-box}`}</style>

      {/* BODY */}
      <div className="page-shell-narrow" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: SECTION_GAP, animation: "fadeUp 0.5s 0.05s ease both" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--nm-accent)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", marginBottom: LABEL_GAP }}>Configuration · Le Point Travaux</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "-0.01em" }}>Paramètres</h1>
          <p style={{ fontSize: 13, color: "var(--nm-text-muted)", marginTop: 5 }}>Profil et chantier</p>
        </div>

        {/* Profil */}
        <div style={{ ...CARD, marginBottom: SECTION_GAP, animation: "fadeUp 0.5s 0.15s ease both" }}>
          <div style={CARD_TITLE}>Profil</div>

          <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: FIELD_GAP, marginBottom: FIELD_GAP }}>
            <div>
              <label htmlFor="param-nom" style={LABEL}>Nom</label>
              <input id="param-nom" style={INPUT} type="text" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label htmlFor="param-prenom" style={LABEL}>Prénom</label>
              <input id="param-prenom" style={INPUT} type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="param-adresse" style={LABEL}>Adresse du chantier</label>
            <input id="param-adresse" style={INPUT} type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>
        </div>

        {/* Chantier */}
        <div style={{ ...CARD, marginBottom: SECTION_GAP, animation: "fadeUp 0.5s 0.2s ease both" }}>
          <div style={CARD_TITLE}>Dates du chantier</div>

          <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: FIELD_GAP }}>
            <div>
              <label htmlFor="param-debut" style={LABEL}>Début chantier</label>
              <input id="param-debut" style={INPUT} type="date" value={dateDebutChantier} onChange={(e) => setDateDebutChantier(e.target.value)} />
            </div>
            <div>
              <label htmlFor="param-livraison" style={LABEL}>Livraison prévue</label>
              <input id="param-livraison" style={INPUT} type="date" value={dateLivraisonPrevue} onChange={(e) => setDateLivraisonPrevue(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: SECTION_GAP, animation: "fadeUp 0.5s 0.25s ease both" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...BTN, background: saving ? "var(--nm-accent-hover)" : "var(--nm-accent)", border: "none", color: "var(--nm-text-on-accent)", cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saveSuccess && <span style={{ ...RESULT_TEXT, color: "var(--nm-success)" }}>✓ Paramètres sauvegardés</span>}
          {saveError && <span style={{ ...RESULT_TEXT, color: "var(--nm-danger)" }}>✗ {saveError}</span>}
        </div>

        {/* IA / OpenRouter — admin uniquement */}
        {user?.isAdmin && (
          <div style={{ ...CARD, marginBottom: SECTION_GAP, animation: "fadeUp 0.5s 0.25s ease both" }}>
            <div style={CARD_TITLE}>IA · OpenRouter</div>

            <div style={{ marginBottom: FIELD_GAP }}>
              <label style={LABEL}>Modèle</label>
              <div style={FIELD}>{model || "—"}</div>
              <p style={{ fontSize: 11, color: "var(--nm-text-muted)", marginTop: LABEL_GAP }}>Configuré dans <code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>backend/.env</code> (<code style={{ fontFamily: "var(--font-jetbrains-mono)" }}>SUIVI_CHANTIER_OpenRouter__Model</code>).</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={handleTest}
                disabled={testing}
                style={{ ...BTN, background: "var(--nm-base-raised)", border: "1px solid var(--nm-border-strong)", color: "var(--nm-text-secondary)", cursor: testing ? "not-allowed" : "pointer" }}
              >
                {testing ? "Test…" : "Tester la connexion"}
              </button>
              {testResult && <span style={{ ...RESULT_TEXT, color: testResult.success ? "var(--nm-success)" : "var(--nm-danger)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{testResult.success ? "✓ " : "✗ "}{testResult.message}</span>}
            </div>
          </div>
        )}

        {/* Zone dangereuse — admin uniquement */}
        {user?.isAdmin && (
          <div style={{ ...CARD, borderColor: "var(--nm-danger-border)", animation: "fadeUp 0.5s 0.3s ease both" }}>
            <div style={{ ...CARD_TITLE, color: "var(--nm-danger)", marginBottom: 14 }}>Zone dangereuse</div>
            <p style={{ fontSize: 12, color: "var(--nm-text-muted)", marginBottom: 16 }}>Supprime définitivement tous les devis, factures et entreprises. La configuration est conservée.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={handleReset}
                disabled={resetting}
                style={{ ...BTN, background: resetting ? "var(--nm-danger-border)" : "var(--nm-danger-bg)", border: "1px solid var(--nm-danger)", color: "var(--nm-text-on-accent)", cursor: resetting ? "not-allowed" : "pointer" }}
              >
                {resetting ? "Suppression…" : "RAZ toute la base"}
              </button>
              {resetResult && (
                <span style={{ ...RESULT_TEXT, color: resetResult.success ? "var(--nm-success)" : "var(--nm-danger)" }}>
                  {resetResult.success ? "✓ " : "✗ "}{resetResult.message}
                </span>
              )}
            </div>
          </div>
        )}
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
