import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--nm-base)", color: "var(--nm-text-primary)", minHeight: "100vh", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <TopBar />
      <main className="has-bottom-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
