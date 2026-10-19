"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("E-mail ou senha incorretos.");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "0.2em", background: "linear-gradient(135deg, #e0b830, #c9a227, #f4e490)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ACCESS FIT
            </span>
          </Link>
          <p style={{ color: "var(--gold)", fontSize: "0.75rem", fontStyle: "italic", marginTop: "0.25rem" }}>
            Desbloqueie sua energia infinita
          </p>
          <h1 style={{ color: "var(--bg-soft)", fontSize: "1.25rem", fontWeight: 700, marginTop: "1rem" }}>
            Entrar na sua conta
          </h1>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: "#0d0d0d", border: "1px solid rgba(122, 84, 14, 0.4)", borderRadius: "1rem", padding: "2rem" }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ backgroundColor: "rgba(153, 27, 27, 0.3)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "0.875rem", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.25rem" }}>
                {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "#080808", border: "1px solid #7a540e", borderRadius: "0.75rem", color: "var(--bg-soft)", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => { e.target.style.borderColor = "#c9a227"; e.target.style.boxShadow = "0 0 0 2px rgba(201,162,39,0.2)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#7a540e"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Senha */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  style={{ width: "100%", padding: "0.75rem 2.75rem 0.75rem 1rem", backgroundColor: "#080808", border: "1px solid #7a540e", borderRadius: "0.75rem", color: "var(--bg-soft)", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#c9a227"; e.target.style.boxShadow = "0 0 0 2px rgba(201,162,39,0.2)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#7a540e"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0" }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "0.875rem", backgroundColor: loading ? "#7a540e" : "#c9a227", color: "#0d0d0d", fontWeight: 900, fontSize: "1rem", border: "none", borderRadius: "0.75rem", cursor: loading ? "not-allowed" : "pointer", transition: "background-color 0.2s" }}
              onMouseOver={(e) => { if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#e0b830"; }}
              onMouseOut={(e) => { if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#c9a227"; }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "1.5rem" }}>
            Não tem conta?{" "}
            <Link href="/cadastro" style={{ color: "#c9a227", fontWeight: 600, textDecoration: "none" }}>
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
