"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShoppingBag, User, Menu, X, Search } from "lucide-react";
import { useCart } from "@/store/cart";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * O menu antes chamava de "Coleção" o link para /produtos, que é a lista
 * filtrada por categoria — nunca foi coleção. Agora "Categorias" é o que é, e
 * "Coleções" leva para os universos de verdade.
 *
 * As categorias também eram escritas à mão aqui: criar uma no admin não a
 * fazia aparecer na loja. Agora vêm do banco.
 */
const LINKS_FIXOS = [
  { href: "/produtos", label: "Categorias" },
  { href: "/sobre", label: "Sobre Nós" },
];
// Uma categoria por link deixava o topo com oito, nove itens e tirava o peso de
// onde ele importa. As categorias continuam a um clique, no filtro de /produtos
// e no rodapé — o topo guarda só as três portas de entrada.

type Navegacao = {
  categorias: { name: string; slug: string }[];
  colecoes: { name: string; slug: string }[];
};

export default function Header() {
  const { data: session } = useSession();
  // As categorias e coleções vêm do banco; o menu nasce com os links fixos e
  // completa quando a resposta chega. Coleção sem peça não vem, então o link
  // só aparece quando há o que ver do outro lado.
  const { count, openCart } = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [nav, setNav] = useState<Navegacao>({ categorias: [], colecoes: [] });
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // A sacola pulsa quando o número muda. É a confirmação de que o clique
  // funcionou: sem isso o site fica mudo depois de adicionar, e dúvida no meio
  // da compra custa venda. Guarda o valor anterior num ref para não pulsar na
  // primeira pintura, quando o carrinho salvo é lido do navegador.
  const quantidade = count();
  const anterior = useRef<number | null>(null);
  const [pulsando, setPulsando] = useState(false);

  useEffect(() => {
    if (anterior.current !== null && quantidade > anterior.current) {
      setPulsando(true);
      const t = setTimeout(() => setPulsando(false), 500);
      anterior.current = quantidade;
      return () => clearTimeout(t);
    }
    anterior.current = quantidade;
  }, [quantidade]);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/navegacao")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && d) setNav(d); })
      // Menu é enfeite perto do resto: se a busca falhar, os links fixos
      // continuam de pé e a loja segue navegável.
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const navLinks = [
    LINKS_FIXOS[0],
    // Coleção sem peça não entra: link que leva a página vazia é pior que link nenhum.
    ...(nav.colecoes.length ? [{ href: "/colecoes", label: "Coleções" }] : []),
    LINKS_FIXOS[1],
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/produtos?busca=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "rgba(250,246,238,0.97)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(140,100,20,0.15)",
        boxShadow: "0 1px 12px rgba(140,100,20,0.06)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "0 1rem" : "0 1.25rem", height: isMobile ? 64 : 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? "0.5rem" : "1rem" }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "0.75rem", flexShrink: 0 }}>
            <div style={{ width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, position: "relative", flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
              <Image src="/logo.png" alt="Access Fit Logo" fill style={{ objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            {!isMobile && (
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span style={{ fontSize: "1.15rem", fontWeight: 900, letterSpacing: "0.12em", background: "linear-gradient(135deg, #c9920a, #e0b030, #a07010)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ACCESS FIT
                </span>
                <span style={{ fontSize: "0.65rem", color: "#9a7a3a", letterSpacing: "0.06em", fontWeight: 500, marginTop: "0.2rem" }}>
                  Desbloqueie sua energia infinita
                </span>
              </div>
            )}
          </Link>

          {/* Nav desktop */}
          {/* Quebra em mais de uma linha em vez de empurrar item para fora da
              tela. Como as categorias vêm do banco, o menu cresce sozinho
              quando se cria uma nova — sem isso, a última sumiria calada. */}
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.4rem", alignItems: "center", justifyContent: "flex-end", minWidth: 0 }} className="hide-mobile">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                style={{ color: "#7a6030", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em" }}
                onMouseOver={e => (e.currentTarget.style.color = "#b8891a")}
                onMouseOut={e => (e.currentTarget.style.color = "#7a6030")}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>

            {/* Busca */}
            <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center" }}>
              {searchOpen && (
                <input
                  ref={searchRef}
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                  placeholder="Buscar..."
                  style={{ width: isMobile ? 140 : 180, padding: "0.4rem 0.75rem", border: "1px solid rgba(184,137,26,0.35)", borderRadius: "999px", fontSize: "0.82rem", backgroundColor: "#FAF6EE", outline: "none", color: "#1a1510" }}
                />
              )}
              <button type={searchOpen ? "submit" : "button"}
                onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "10px", color: "#7a6030", display: "flex", alignItems: "center", borderRadius: "0.5rem" }}>
                <Search size={20} />
              </button>
            </form>

            {/* User dropdown */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setUserOpen(!userOpen)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "10px", color: "#7a6030", display: "flex", alignItems: "center", borderRadius: "0.5rem" }}>
                <User size={20} />
              </button>
              {userOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setUserOpen(false)} />
                  <div style={{ position: "absolute", right: isMobile ? -10 : 0, top: "calc(100% + 8px)", width: isMobile ? "90vw" : 200, maxWidth: 200, backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "0.875rem", overflow: "hidden", zIndex: 50, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                    {session ? (
                      <>
                        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(140,100,20,0.1)", backgroundColor: "#FAF6EE" }}>
                          <p style={{ color: "#9a8060", fontSize: "0.7rem" }}>Olá,</p>
                          <p style={{ color: "#b8891a", fontSize: "0.9rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {session.user?.name}
                          </p>
                        </div>
                        {[
                          { label: "Minha Conta", href: "/conta" },
                          { label: "Meus Pedidos", href: "/conta/pedidos" },
                          ...((session.user as any)?.role === "admin" ? [{ label: "⚙ Painel Admin", href: "/admin" }] : []),
                        ].map(item => (
                          <Link key={item.href} href={item.href} onClick={() => setUserOpen(false)}
                            style={{ display: "block", padding: "0.65rem 1rem", color: "#3a2a10", fontSize: "0.875rem", textDecoration: "none" }}
                            onMouseOver={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#FAF6EE"; (e.currentTarget as HTMLElement).style.color = "#b8891a"; }}
                            onMouseOut={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; (e.currentTarget as HTMLElement).style.color = "#3a2a10"; }}>
                            {item.label}
                          </Link>
                        ))}
                        <button onClick={() => { signOut(); setUserOpen(false); }}
                          style={{ width: "100%", textAlign: "left", padding: "0.65rem 1rem", background: "none", border: "none", borderTop: "1px solid rgba(140,100,20,0.1)", color: "#c04040", fontSize: "0.875rem", cursor: "pointer" }}>
                          Sair
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/login" onClick={() => setUserOpen(false)}
                          style={{ display: "block", padding: "0.875rem 1rem", color: "#b8891a", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
                          Entrar
                        </Link>
                        <Link href="/cadastro" onClick={() => setUserOpen(false)}
                          style={{ display: "block", padding: "0.875rem 1rem", color: "#7a6030", fontSize: "0.875rem", textDecoration: "none", borderTop: "1px solid rgba(140,100,20,0.1)" }}>
                          Criar conta
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Cart */}
            <button onClick={openCart}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "10px", color: "#7a6030", position: "relative", display: "flex", alignItems: "center", borderRadius: "0.5rem" }}>
              <span className={pulsando ? "pulso-sacola" : undefined} style={{ display: "flex" }}>
                <ShoppingBag size={20} />
              </span>
              {mounted && quantidade > 0 && (
                <span className={pulsando ? "pulso-sacola" : undefined}
                  style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#b8891a", color: "#fff", fontSize: "0.6rem", fontWeight: 900, borderRadius: "999px", minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                  {quantidade}
                </span>
              )}
            </button>

            {/* Hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "10px", color: "#7a6030", display: "none", alignItems: "center", borderRadius: "0.5rem" }}
              className="show-mobile">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div style={{ backgroundColor: "#F5EFE2", borderTop: "1px solid rgba(140,100,20,0.1)", padding: "0.5rem 1rem 1rem" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 0 0.75rem", borderBottom: "1px solid rgba(140,100,20,0.08)" }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar produto..."
                style={{ flex: 1, padding: "0.5rem 0.875rem", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "999px", fontSize: "0.875rem", backgroundColor: "#fff", outline: "none" }}
              />
              <button type="submit" style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "999px", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                Buscar
              </button>
            </form>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                style={{ display: "block", padding: "0.75rem 0.5rem", color: "#5a4020", fontSize: "0.95rem", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(140,100,20,0.06)" }}>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 768px) { .hide-mobile { display: none !important; } .show-mobile { display: flex !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
      `}</style>
    </>
  );
}
