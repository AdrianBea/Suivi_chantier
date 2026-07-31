import TopBar from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#1B1B1B", color: "#F0EDE8", minHeight: "100vh", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <TopBar />
      <main>{children}</main>
    </div>
  );
}
