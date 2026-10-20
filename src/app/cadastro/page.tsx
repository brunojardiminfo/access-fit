"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  backgroundColor: "#080808",
  border: "1px solid #7a540e",
  borderRadius: "0.75rem",
  color: "var(--bg-soft)",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box" as const,
};

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", birthDate: "", password: "" });
  const [error, setError] = useState("");
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAlreadyExists(false);
    setPhoneExists(false);
    setLoading(true);

    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar conta.");
      if (data.alreadyExists) setAlreadyExists(true);
      if (data.phoneExists) setPhoneExists(true);
      setLoading(false);
      return;
    }

    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
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
            Criar conta
          </h1>
        </div>

        <div style={{ backgroundColor: "#0d0d0d", border: "1px solid rgba(122, 84, 14, 0.4)", borderRadius: "1rem", padding: "2rem" }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ backgroundColor: "rgba(153, 27, 27, 0.3)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "0.875rem", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.25rem" }}>
                {error}
                {alreadyExists && (
                  <div style={{ marginTop: "0.625rem" }}>
                    <Link href={`/login?email=${encodeURIComponent(form.email)}`} style={{ display: "inline-block", backgroundColor: "var(--gold)", color: "#16110b", fontWeight: 700, fontSize: "0.8rem", padding: "0.4rem 1rem", borderRadius: "0.5rem", textDecoration: "none" }}>
                      Fazer login →
                    </Link>
                  </div>
                )}
                {phoneExists && (
                  <div style={{ marginTop: "0.625rem" }}>
                    <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Meu número ${form.phone} já tem pedidos e quero acessar minha conta.`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-block", backgroundColor: "#25D366", color: "var(--text-main)", fontWeight: 700, fontSize: "0.8rem", padding: "0.4rem 1rem", borderRadius: "0.5rem", textDecoration: "none" }}>
                      📱 Falar com a loja
                    </a>
                  </div>
                )}
              </div>
            )}

            {[
              { label: "Nome completo", key: "name", type: "text", placeholder: "Seu nome" },
              { label: "E-mail", key: "email", type: "email", placeholder: "seu@email.com" },
              { label: "WhatsApp / Celular", key: "phone", type: "tel", placeholder: "(11) 9 9999-9999" },
              { label: "Data de nascimento", key: "birthDate", type: "date", placeholder: "" },
              { label: "Senha", key: "password", type: "password", placeholder: "Mínimo 6 caracteres" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                  minLength={key === "password" ? 6 : undefined}
                  placeholder={placeholder}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#c9a227"; e.target.style.boxShadow = "0 0 0 2px rgba(201,162,39,0.2)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#7a540e"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "0.875rem", backgroundColor: loading ? "#7a540e" : "#c9a227", color: "#0d0d0d", fontWeight: 900, fontSize: "1rem", border: "none", borderRadius: "0.75rem", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "1.5rem" }}>
            Já tem conta?{" "}
            <Link href="/login" style={{ color: "#c9a227", fontWeight: 600, textDecoration: "none" }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
