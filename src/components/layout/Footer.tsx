"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Navegacao = {
  categorias: { name: string; slug: string }[];
  colecoes: { name: string; slug: string }[];
};

export default function Footer() {
  // As categorias eram escritas à mão aqui; criar uma no admin não a fazia
  // aparecer no rodapé. Agora vêm do banco, junto das coleções.
  const [nav, setNav] = useState<Navegacao>({ categorias: [], colecoes: [] });

  useEffect(() => {
    let vivo = true;
    fetch("/api/navegacao")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && d) setNav(d); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  return (
    <footer style={{ backgroundColor: "#1a1510", borderTop: "1px solid rgba(184,137,26,0.15)", color: "#9a8060" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1.5rem" }}>

          {/* Marca */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
              <div style={{ width: 44, height: 44, position: "relative", flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
                <Image src="/logo.png" alt="Access Fit" fill style={{ objectFit: "cover" }} />
              </div>
              <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "0.12em", background: "linear-gradient(135deg, #c9920a, #e0b030, #a07010)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ACCESS FIT
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", lineHeight: 1.7, color: "#7a6a4a", marginBottom: "0.75rem" }}>
              Moda fitness feminina que desperta a força que existe em você.
            </p>
            <p style={{ fontSize: "0.75rem", color: "#5a4a30", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>📍</span> Porto Alegre, RS
            </p>
            <p style={{ fontSize: "0.75rem", color: "#5a4a30", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>🚚</span> Enviamos para todo o Brasil
            </p>
          </div>

          {/* Categorias — o que a peça é */}
          <div>
            <h3 style={{ color: "#b8891a", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>Categorias</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { label: "Ver tudo", slug: "" },
                ...nav.categorias.map(c => ({ label: c.name, slug: c.slug })),
              ].map(item => (
                <li key={item.label}>
                  <Link href={item.slug ? `/produtos?categoria=${item.slug}` : "/produtos"}
                    style={{ color: "#7a6a4a", fontSize: "0.85rem", textDecoration: "none" }}
                    onMouseOver={e => (e.currentTarget.style.color = "#b8891a")}
                    onMouseOut={e => (e.currentTarget.style.color = "#7a6a4a")}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coleções — o que a peça conta */}
          {nav.colecoes.length > 0 && (
            <div>
              <h3 style={{ color: "#b8891a", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>Coleções</h3>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[{ name: "Ver todas", slug: "" }, ...nav.colecoes].map(c => (
                  <li key={c.slug || "todas"}>
                    <Link href={c.slug ? `/colecoes/${c.slug}` : "/colecoes"}
                      style={{ color: "#7a6a4a", fontSize: "0.85rem", textDecoration: "none" }}
                      onMouseOver={e => (e.currentTarget.style.color = "#b8891a")}
                      onMouseOut={e => (e.currentTarget.style.color = "#7a6a4a")}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Informações */}
          <div>
            <h3 style={{ color: "#b8891a", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>Informações</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { label: "Sobre Nós", href: "/sobre" },
                { label: "Home Try-On", href: "/sobre#home-try-on" },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href}
                    style={{ color: "#7a6a4a", fontSize: "0.85rem", textDecoration: "none" }}
                    onMouseOver={e => (e.currentTarget.style.color = "#b8891a")}
                    onMouseOut={e => (e.currentTarget.style.color = "#7a6a4a")}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 style={{ color: "#b8891a", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>Contato</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

              {/* WhatsApp — só texto, botão flutuante já cobre */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{ fontSize: "1rem" }}>💬</span>
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#9a8060", fontWeight: 600 }}>(51) 98659-6705</p>
                  <p style={{ fontSize: "0.7rem", color: "#5a4a30" }}>WhatsApp · Fale conosco</p>
                </div>
              </div>

              {/* Email */}
              <a href="mailto:accessfitpoa@gmail.com"
                style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", color: "#7a6a4a" }}>
                <div style={{ width: 32, height: 32, backgroundColor: "#b8891a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#9a8060", fontWeight: 600 }}>accessfitpoa@gmail.com</p>
                  <p style={{ fontSize: "0.7rem", color: "#5a4a30" }}>Envie um e-mail</p>
                </div>
              </a>

              {/* Instagram */}
              <a href="https://instagram.com/accessfit_poa" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", color: "#7a6a4a" }}>
                <div style={{ width: 32, height: 32, background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#9a8060", fontWeight: 600 }}>@accessfit_poa</p>
                  <p style={{ fontSize: "0.7rem", color: "#5a4a30" }}>Siga no Instagram</p>
                </div>
              </a>

            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid rgba(184,137,26,0.1)", marginTop: "2.5rem", paddingTop: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#5a4a30" }}>© 2025 Access Fit · Porto Alegre, RS · Enviamos para todo o Brasil</p>
          <p style={{ fontSize: "0.7rem", color: "#b8891a", fontStyle: "italic" }}>✦ Desbloqueie sua energia infinita ✦</p>
        </div>
      </div>
    </footer>
  );
}
