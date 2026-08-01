import Image from "next/image";

export default function MaintenancePage() {
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
        gap: 0,
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <Image src="/logo.svg" alt="Le Point Travaux" width={32} height={32} priority />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.02em" }}>Le Point Travaux</span>
      </div>

      <CraneIllustration />

      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "var(--nm-accent)",
          textTransform: "uppercase",
          fontFamily: "var(--font-jetbrains-mono)",
          marginTop: 28,
        }}
      >
        Chantier en cours
      </div>
      <h1 style={{ fontSize: "clamp(22px, 6vw, 30px)", fontWeight: 700, letterSpacing: "-0.01em", marginTop: 10, maxWidth: 480 }}>
        Le site est en maintenance
      </h1>
      <p style={{ fontSize: 15, color: "var(--nm-text-muted)", maxWidth: 420, marginTop: 12, lineHeight: 1.6 }}>
        Pas de pierres, pas de palais.
        Pas de palais, pas de palais.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 28,
          background: "var(--nm-base-raised)",
          border: "1px solid var(--nm-border)",
          borderRadius: 20,
          padding: "8px 16px",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--nm-warning)",
            boxShadow: "0 0 6px 1px color-mix(in srgb, var(--nm-warning) 55%, transparent)",
            animation: "pulse 1.6s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 12, color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)" }}>
          Maintenance en cours
        </span>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}

function CraneIllustration() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: "100%", height: "auto" }}>
      {/* sol */}
      <line x1="10" y1="148" x2="210" y2="148" stroke="var(--nm-border)" strokeWidth="2" />

      {/* mât de la grue */}
      <line x1="60" y1="148" x2="60" y2="24" stroke="var(--nm-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
      {/* flèche */}
      <line x1="60" y1="24" x2="190" y2="24" stroke="var(--nm-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="24" x2="30" y2="24" stroke="var(--nm-text-tertiary)" strokeWidth="3" strokeLinecap="round" />
      {/* contrepoids */}
      <rect x="20" y="24" width="16" height="12" rx="1" fill="var(--nm-border-strong)" />
      {/* haubans */}
      <line x1="60" y1="24" x2="140" y2="42" stroke="var(--nm-border-strong)" strokeWidth="1.5" />
      <line x1="60" y1="24" x2="35" y2="35" stroke="var(--nm-border-strong)" strokeWidth="1.5" />
      {/* cabine */}
      <rect x="50" y="24" width="18" height="14" rx="2" fill="var(--nm-accent)" opacity="0.9" />
      {/* câble + crochet */}
      <line x1="150" y1="24" x2="150" y2="70" stroke="var(--nm-text-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M146 70 h8 v6 a4 4 0 0 1 -8 0 z" fill="var(--nm-warning)" />

      {/* bâtiment en construction */}
      <rect x="90" y="88" width="70" height="60" fill="var(--nm-base-raised)" stroke="var(--nm-border)" strokeWidth="1.5" />
      <line x1="90" y1="106" x2="160" y2="106" stroke="var(--nm-border)" strokeWidth="1" />
      <line x1="90" y1="124" x2="160" y2="124" stroke="var(--nm-border)" strokeWidth="1" />
      <line x1="112" y1="88" x2="112" y2="148" stroke="var(--nm-border)" strokeWidth="1" />
      <line x1="136" y1="88" x2="136" y2="148" stroke="var(--nm-border)" strokeWidth="1" />
      <rect x="95" y="112" width="12" height="10" fill="var(--nm-accent)" opacity="0.5" />
      <rect x="141" y="130" width="12" height="10" fill="var(--nm-accent)" opacity="0.5" />

      {/* barrières de chantier */}
      <g stroke="var(--nm-warning)" strokeWidth="2">
        <line x1="168" y1="148" x2="168" y2="136" />
        <line x1="184" y1="148" x2="184" y2="136" />
        <line x1="166" y1="139" x2="186" y2="142" />
        <line x1="166" y1="144" x2="186" y2="147" />
      </g>
    </svg>
  );
}
