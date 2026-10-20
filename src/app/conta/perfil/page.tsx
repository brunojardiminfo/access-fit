"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const inp = {
  padding: "0.75rem 1rem", border: "1px solid var(--border)",
  borderRadius: "0.625rem", fontSize: "0.9rem", backgroundColor: "var(--bg-card)",
  outline: "none", width: "100%", boxSizing: "border-box" as const,
};

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user) {
      setName((session.user as any).name || "");
      fetch("/api/conta/perfil").then(r => r.json()).then(d => {
        setName(d.name || "");
        setPhone(d.phone || "");
      }).catch(() => {});
    }
  }, [session, status]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/conta/perfil", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (status === "loading") return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg)" }}><div style={{ width: 32, height: 32, border: "3px solid rgba(184,137,26,0.2)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/conta" style={{ color: "var(--gold)", fontSize: "0.875rem", textDecoration: "none" }}>← Minha Conta</Link>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text-main)", margin: "0.3rem 0 1.5rem" }}>Dados Pessoais</h1>

        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-sub)", display: "block", marginBottom: "0.3rem" }}>Nome completo</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-sub)", display: "block", marginBottom: "0.3rem" }}>E-mail</label>
            <input style={{ ...inp, backgroundColor: "var(--bg)", color: "var(--text-muted)" }} value={session?.user?.email || ""} disabled />
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>O e-mail não pode ser alterado</p>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-sub)", display: "block", marginBottom: "0.3rem" }}>WhatsApp / Telefone</label>
            <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(51) 9..." />
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ backgroundColor: saved ? "#5fd37a" : "var(--gold)", color: "var(--bg)", border: "none", borderRadius: "0.75rem", padding: "0.875rem", fontWeight: 900, fontSize: "0.95rem", cursor: "pointer", marginTop: "0.5rem" }}>
            {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
