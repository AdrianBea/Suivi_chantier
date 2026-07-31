import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar() {
  return (
    <header style={{ background: "var(--nm-base)", boxShadow: "0 2px 10px var(--nm-shadow-dark)", padding: "0 40px", display: "flex", alignItems: "center", gap: 40, height: 52, position: "sticky", top: 0, zIndex: 10 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0, cursor: "pointer" }}>
        <Image src="/logo.svg" alt="Le Point Travaux" width={28} height={28} priority />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "0.02em" }}>Le Point Travaux</span>
      </Link>
      <Nav />
      <ThemeToggle />
    </header>
  );
}
