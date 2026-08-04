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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.auth.login(email, password);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion.");
    } finally {
      setPending(false);
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
      <button type="submit" disabled={pending} className="pressable" style={buttonStyle}>
        {pending ? "Connexion..." : "Se connecter"}
      </button>
      <p style={{ fontSize: 13, color: "var(--nm-text-muted)", textAlign: "center", margin: 0 }}>
        Pas de compte ? <Link href="/signup">S&apos;inscrire</Link>
      </p>
    </form>
  );
}
