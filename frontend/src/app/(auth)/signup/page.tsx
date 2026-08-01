"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { buttonStyle, cardStyle, inputStyle } from "../form-styles";

type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "transparent" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: "Trop faible", color: "#e33" },
    { score: 1, label: "Faible", color: "#e33" },
    { score: 2, label: "Moyen", color: "#e8a33d" },
    { score: 3, label: "Bon", color: "#4caf50" },
    { score: 4, label: "Excellent", color: "#2e7d32" },
  ];
  const clamped = Math.min(score, 4) as PasswordStrength["score"];
  return { ...levels[clamped], score: clamped };
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [dateDebutChantier, setDateDebutChantier] = useState("");
  const [dateLivraisonPrevue, setDateLivraisonPrevue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const strength = evaluatePasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api.auth.signup(
        email,
        password,
        passwordConfirmation,
        dateDebutChantier || null,
        dateLivraisonPrevue || null,
      );
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Inscription</h1>
      <p style={{ fontSize: 12, color: "var(--nm-text-muted)", margin: 0 }}>
        Les champs marqués d&apos;un * sont obligatoires.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email *"
        required
        autoFocus
        style={inputStyle}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (8 caractères min.) *"
          required
          minLength={8}
          style={inputStyle}
        />
        {password && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: "var(--nm-radius-sm)",
                background: "var(--nm-base)",
                boxShadow: "inset 2px 2px 4px var(--nm-shadow-dark), inset -2px -2px 4px var(--nm-shadow-light)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(strength.score / 4) * 100}%`,
                  background: strength.color,
                  borderRadius: "var(--nm-radius-sm)",
                  transition: "width 150ms ease, background-color 150ms ease",
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
          </div>
        )}
      </div>
      <input
        type="password"
        value={passwordConfirmation}
        onChange={(e) => setPasswordConfirmation(e.target.value)}
        placeholder="Confirmation du mot de passe *"
        required
        minLength={8}
        style={inputStyle}
      />
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--nm-text-muted)" }}>
        Date de début de chantier
        <input
          type="date"
          value={dateDebutChantier}
          onChange={(e) => setDateDebutChantier(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--nm-text-muted)" }}>
        Date de livraison prévue
        <input
          type="date"
          value={dateLivraisonPrevue}
          onChange={(e) => setDateLivraisonPrevue(e.target.value)}
          style={inputStyle}
        />
      </label>
      {error && <p style={{ color: "#e33", fontSize: 13, margin: 0 }}>{error}</p>}
      <button type="submit" disabled={pending} className="pressable" style={buttonStyle}>
        {pending ? "Création..." : "Créer le compte"}
      </button>
      <p style={{ fontSize: 13, color: "var(--nm-text-muted)", textAlign: "center", margin: 0 }}>
        Déjà un compte ? <Link href="/login">Se connecter</Link>
      </p>
    </form>
  );
}
