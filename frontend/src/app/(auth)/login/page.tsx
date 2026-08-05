"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE, api } from "@/lib/api";
import { buttonStyle, cardStyle, inputStyle } from "../form-styles";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Réveille le backend et la base Railway (plan gratuit en veille après inactivité).
    fetch(`${API_BASE}/api/auth/ping`).catch(() => {});
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setRetrying(false);
    setError(null);
    try {
      await api.auth.login(email, password, () => setRetrying(true));
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion.");
    } finally {
      setPending(false);
      setRetrying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Connexion</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        autoFocus
        style={inputStyle}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        required
        style={inputStyle}
      />
      {error && <p style={{ color: "#e33", fontSize: 13, margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="pressable"
        style={{ ...buttonStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: pending ? 0.7 : 1 }}
      >
        {pending && (
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              border: "2px solid var(--nm-border-strong)",
              borderTopColor: "var(--nm-accent)",
              borderRadius: "50%",
              animation: "spin 0.85s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      {/* Le réveil de l'instance Railway endormie dépasse souvent 20 s : on l'explique
          plutôt que de laisser l'utilisateur devant un bouton figé. */}
      <p aria-live="polite" style={{ fontSize: 12, color: "var(--nm-text-muted)", textAlign: "center", margin: 0, minHeight: 15 }}>
        {retrying ? "Le serveur se réveille, nouvelle tentative en cours…" : ""}
      </p>
      <p style={{ fontSize: 13, color: "var(--nm-text-muted)", textAlign: "center", margin: 0 }}>
        Pas de compte ? <Link href="/signup">S&apos;inscrire</Link>
      </p>
    </form>
  );
}
