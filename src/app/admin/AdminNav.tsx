"use client";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/store/admin";
import { useMobileView } from "@/hooks/useMediaQuery";
import { getNavLinks } from "@/lib/permissions";

// Analytics (/admin/analytics), Metricas (/admin/metricas) e o painel financeiro
// completo (/admin/financeiro/completo) continuam funcionando pela URL, mas ficam
// fora do menu para manter o dia a dia enxuto.
const ALL_LINKS = [
  { href: "/admin",             label: "Início",      emoji: "🏠" },
  { href: "/admin/pedidos",     label: "Pedidos",     emoji: "📦" },
  { href: "/admin/produtos",    label: "Produtos",    emoji: "👗" },
  { href: "/admin/caderno",     label: "Caderno",     emoji: "📒" },
  { href: "/admin/clientes",    label: "Clientes",    emoji: "👥" },
  { href: "/admin/followup",    label: "Follow-up",   emoji: "📩" },
  { href: "/admin/financeiro",  label: "Financeiro",  emoji: "💳" },
  { href: "/admin/devolucoes",  label: "Devoluções",  emoji: "🔄" },
  { href: "/admin/marketing",   label: "Marketing",   emoji: "📣" },
  { href: "/admin/gestao",      label: "Gestão",      emoji: "⚙️" },
];

const Stars = () => (
  <svg width="260" height="80" viewBox="0 0 260 80" fill="none" style={{ position: "absolute", right: 0, top: 0, opacity: 0.15, pointerEvents: "none" }}>
    <path d="M210 18 L212 24 L218 26 L212 28 L210 34 L208 28 L202 26 L208 24 Z" fill="#b8891a"/>
    <path d="M240 8  L241.5 13 L247 14.5 L241.5 16 L240 21 L238.5 16 L233 14.5 L238.5 13 Z" fill="#b8891a"/>
    <path d="M228 50 L229.5 55 L235 56.5 L229.5 58 L228 63 L226.5 58 L221 56.5 L226.5 55 Z" fill="#b8891a"/>
    <path d="M185 62 L186.2 66 L190 67.5 L186.2 69 L185 73 L183.8 69 L180 67.5 L183.8 66 Z" fill="#b8891a"/>
    <circle cx="198" cy="40" r="2" fill="#b8891a"/>
    <circle cx="250" cy="38" r="1.5" fill="#b8891a"/>
    <circle cx="170" cy="25" r="1.2" fill="#b8891a"/>
    <circle cx="220" cy="70" r="1.5" fill="#b8891a"/>
    <circle cx="255" cy="60" r="1.2" fill="#b8891a"/>
    <path d="M160 72 Q200 15 260 28" stroke="#b8891a" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <path d="M175 5 Q215 50 260 45" stroke="#b8891a" strokeWidth="0.5" fill="none" opacity="0.35"/>
  </svg>
);

export default function AdminNav({ adminRole }: { adminRole?: string | null }) {
  const pathname = usePathname();
  const { hideProfit, toggleHideProfit } = useAdmin();
  const isMobile = useMobileView();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const allowedNav = getNavLinks(adminRole);
  const links = allowedNav.includes("*")
    ? ALL_LINKS
    : ALL_LINKS.filter(l => allowedNav.includes(l.href));

  return (
    <>
      {/* ── DESKTOP ── */}
      <header className="admin-header" style={{
        backgroundColor: "#FFFDF7",
        borderBottom: "1px solid rgba(184,137,26,0.18)",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 16px rgba(184,137,26,0.07)",
        overflow: "hidden",
      }}>
        <Stars />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "0 1rem" : "0 1.5rem" }}>
          {/* Logo + título + toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "1rem", padding: isMobile ? "0.75rem 0" : "1rem 0 0.75rem", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "1rem", minWidth: 0 }}>
            <img src="/logo.png" alt="Access Fit"
              style={{ width: isMobile ? 40 : 56, height: isMobile ? 40 : 56, borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 12px rgba(184,137,26,0.3)", flexShrink: 0 }} />
              {!isMobile && <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#1a1510", letterSpacing: "-0.03em", lineHeight: 1 }}>Access Fit</div>
                <div style={{ fontSize: "0.65rem", color: "#b8891a", fontWeight: 700, letterSpacing: "0.1em", marginTop: "0.2rem" }}>PAINEL ADMINISTRATIVO</div>
              </div>}
            </div>
            {!isMobile && <button onClick={toggleHideProfit} title={hideProfit ? "Modo apresentação: ON" : "Modo apresentação: OFF"}
              style={{ alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", backgroundColor: hideProfit ? "#b8891a" : "#f5f5f5", color: hideProfit ? "#fff" : "#7a6040", border: "1px solid rgba(184,137,26,0.2)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "flex" }}>
              {hideProfit ? "👁️ ON" : "👁️ OFF"}
            </button>}
          </div>

          {/* Links de navegação */}
          <nav style={{ display: "flex", gap: isMobile ? "0.1rem" : "0.25rem", paddingBottom: "0.25rem", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {links.map(l => (
              <a key={l.href} href={l.href} title={l.label} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                padding: isMobile ? "0.5rem" : "0.55rem 1.1rem",
                borderRadius: "0.625rem 0.625rem 0 0",
                textDecoration: "none",
                fontSize: isMobile ? "0.7rem" : "0.875rem",
                fontWeight: 700,
                color: isActive(l.href) ? "#b8891a" : "#7a6040",
                backgroundColor: isActive(l.href) ? "rgba(184,137,26,0.08)" : "transparent",
                borderBottom: isActive(l.href) ? "3px solid #b8891a" : "3px solid transparent",
                whiteSpace: isMobile ? "nowrap" : "normal",
                transition: "all 0.15s",
                flexShrink: 0,
                minWidth: isMobile ? "44px" : "auto",
              }}>
                <span style={{ fontSize: "1rem" }}>{l.emoji}</span>
                {!isMobile && l.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── MOBILE: bottom bar ── */}
      <nav className="admin-bottomnav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: "#FFFDF7",
        borderTop: "1px solid rgba(184,137,26,0.2)",
        display: "flex",
        boxShadow: "0 -2px 16px rgba(184,137,26,0.1)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {links.map(l => (
          <a key={l.href} href={l.href} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "0.6rem 0.25rem 0.5rem",
            textDecoration: "none", gap: "0.2rem",
            color: isActive(l.href) ? "#b8891a" : "#9a8060",
            borderTop: isActive(l.href) ? "2.5px solid #b8891a" : "2.5px solid transparent",
            backgroundColor: isActive(l.href) ? "rgba(184,137,26,0.05)" : "transparent",
          }}>
            <span style={{ fontSize: "1.35rem", lineHeight: 1 }}>{l.emoji}</span>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>{l.label}</span>
          </a>
        ))}
      </nav>

    </>
  );
}
