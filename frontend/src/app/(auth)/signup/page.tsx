"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { buttonStyle, cardStyle, inputStyle } from "../form-styles";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [dateDebutChantier, setDateDebutChantier] = useState("");
  const [dateLivraisonPrevue, setDateLivraisonPrevue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        placeholder="Mot de passe (8 caractères min.)"
        required
        minLength={8}
        style={inputStyle}
      />
      <input
        type="password"
        value={passwordConfirmation}
        onChange={(e) => setPasswordConfirmation(e.target.value)}
        placeholder="Confirmation du mot de passe"
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
