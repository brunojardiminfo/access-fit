"use client";

import { useEffect, useState } from "react";

type CouponData = {
  codigo: string;
  desconto: number;
  tipo: string;
  msg: string;
};

export default function BirthdayCoupon() {
  const [disponivel, setDisponivel] = useState(false);
  const [cupom, setCupom] = useState<CouponData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerado, setGerado] = useState(false);

  useEffect(() => {
    verificarCupom();
  }, []);

  const verificarCupom = async () => {
    try {
      const response = await fetch("/api/usuario/cupom-aniversario");
      const data = await response.json();
      setDisponivel(data.disponivel);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const gerarCupom = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/usuario/cupom-aniversario", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setCupom(data.cupom);
        setGerado(true);
        setDisponivel(false);
      } else {
        alert(data.error || "Erro ao gerar cupom");
      }
    } catch (error) {
      alert("Erro ao gerar cupom");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // Se já foi gerado, mostrar cupom
  if (gerado && cupom) {
    return (
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "rgba(216,166,44,0.12)",
          border: "2px solid var(--gold)",
          borderRadius: "8px",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)", margin: "0 0 0.5rem 0" }}>
          🎂 {cupom.msg}
        </p>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "var(--bg-card)",
            borderRadius: "6px",
            border: "2px dashed var(--gold)",
            marginBottom: "1rem",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", margin: "0 0 0.5rem 0" }}>
            Código do cupom:
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              color: "var(--gold)",
              margin: 0,
              fontFamily: "monospace",
            }}
          >
            {cupom.codigo}
          </p>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-sub)", margin: 0 }}>
          {cupom.desconto}% de desconto válido apenas este mês! 🎉
        </p>
      </div>
    );
  }

  // Se disponível, mostrar botão
  if (disponivel) {
    return (
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "rgba(95,211,122,0.12)",
          border: "2px solid #5fd37a",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "#5fd37a", marginBottom: "1rem" }}>
          🎂 Você tem um cupom de aniversário!
        </p>
        <button
          onClick={gerarCupom}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#2a6a2a",
            color: "var(--text-main)",
            border: "none",
            borderRadius: "6px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Gerando..." : "Gerar Cupom Agora"}
        </button>
      </div>
    );
  }

  return null;
}
