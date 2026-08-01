import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/Nav";
import UserMenu from "@/components/UserMenu";

export default function TopBar() {
  return (
    <header style={{ background: "var(--nm-base)", boxShadow: "0 2px 10px var(--nm-shadow-dark)", padding: "0 clamp(16px, 4vw, 40px)", display: "flex", alignItems: "center", gap: "clamp(16px, 3vw, 40px)", height: 52, position: "sticky", top: 0, zIndex: 10 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0, cursor: "pointer", minWidth: 0 }}>
        <Image src="/logo.svg" alt="Le Point Travaux" width={28} height={28} priority />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Le Point Travaux</span>
      </Link>
      <Nav />
      <UserMenu />
    </header>
  );
}
