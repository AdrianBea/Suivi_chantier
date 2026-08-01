"use client";

import { useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 767px)";

// useSyncExternalStore re-souscrit dès que `subscribe` change d'identité :
// on mémoïse par query pour garder une référence stable entre les rendus.
const subscribers = new Map<string, (onChange: () => void) => () => void>();

function subscribe(query: string) {
  let fn = subscribers.get(query);
  if (!fn) {
    fn = (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    };
    subscribers.set(query, fn);
  }
  return fn;
}

/**
 * `false` au premier rendu serveur : le HTML est généré en desktop puis corrigé
 * à l'hydratation. Les styles mobiles reposent sur les media queries CSS de
 * globals.css, qui s'appliquent avant même l'hydratation — ce hook ne sert
 * qu'aux cas où le JSX lui-même doit différer (onglets de modale, width).
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
