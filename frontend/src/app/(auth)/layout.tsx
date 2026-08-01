import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--nm-base)",
        color: "var(--nm-text-primary)",
        minHeight: "100vh",
        fontFamily: "var(--font-space-grotesk), sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image src="/logo.svg" alt="Le Point Travaux" width={36} height={36} priority />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>Le Point Travaux</span>
      </div>
      {children}
    </div>
  );
}
