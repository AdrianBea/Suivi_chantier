"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * Masque les outils réservés aux admins (échanges LLM…).
 * Confort d'affichage uniquement : le vrai contrôle reste [Authorize(Policy = "AdminOnly")]
 * côté backend, qui répond 403 quoi qu'affiche le front.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    api.auth.me().then((u) => setIsAdmin(u.isAdmin)).catch(() => setIsAdmin(false));
  }, []);
  return isAdmin;
}
