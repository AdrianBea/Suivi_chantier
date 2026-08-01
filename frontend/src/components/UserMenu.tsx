"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UserDto } from "@/lib/types";

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await api.auth.logout();
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    // en mobile, e-mail et déconnexion sont repris dans la feuille « Plus » de BottomNav
    <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto", flexShrink: 0 }}>
      <span style={{ fontSize: 13, color: "var(--nm-text-muted)" }}>{user.email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="pressable"
        style={{
          background: "var(--nm-base)",
          border: "none",
          borderRadius: "var(--nm-radius-sm)",
          boxShadow: "-4px -4px 10px var(--nm-shadow-light), 4px 4px 10px var(--nm-shadow-dark)",
          padding: "6px 12px",
          fontSize: 13,
          color: "var(--nm-text-primary)",
          cursor: "pointer",
        }}
      >
        Déconnexion
      </button>
    </div>
  );
}
