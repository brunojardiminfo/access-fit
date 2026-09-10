"use client";

import { useEffect, useState } from "react";

type Sacola = {
  id: string; name: string | null; phone: string | null;
  items: string; total: number; pecas: number; updatedAt: string;
};
type Desejada = { nome: string; vezes: number };
type ItemSalvo = { nome?: string; cor?: string; tamanho?: string; peca?: string; quantidade?: number };

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quando(iso: string): string {
  const horas = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (horas < 1) return "há menos de 1h";
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

function listaDeItens(json: string): string[] {
  try {
    const itens: ItemSalvo[] = JSON.parse(json || "[]");
    return itens.map(i => {
      const nome = i.peca ? `${i.nome} - ${i.peca}` : i.nome || "Peça";
      const detalhe = [i.cor, i.tamanho].filter(Boolean).join(", ");
      const qtd = (i.quantidade || 1) > 1 ? ` x${i.quantidade}` : "";
      return detalhe ? `${nome} (${detalhe})${qtd}` : `${nome}${qtd}`;
    });
  } catch {
    return [];
  }
}

export default function CarrinhoAbandonado() {
  const [sacolas, setSacolas] = useState<Sacola[]>([]);
  const [desejadas, setDesejadas] = useState<Desejada[]>([]);
  const [anonimas, setAnonimas] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/carrinhos")
      .then(r => r.json())
      .then(d => {
        setSacolas(d.sacolas || []);
        setDesejadas(d.desejadas || []);
        setAnonimas(d.anonimas || 0);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, []);

  const chamar = (s: Sacola) => {
    if (!s.phone) return;
    const itens = listaDeItens(s.items).map(i => `• ${i}`).join("\n");
    const msg = [
      `Oi${s.name ? `, ${s.name.split(" ")[0]}` : ""}! Aqui é a Brus, da Access Fit 💛`,
      ``,
      `Vi que você separou essas peças e não conseguiu finalizar:`,
      itens,
      ``,
      `Ficou alguma dúvida de tamanho ou pagamento? Posso te ajudar por aqui — e ainda tenho essas peças separadas pra você.`,
    ].join("\n");
    const tel = s.phone.replace(/\D/g, "");
    const ddi = tel.startsWith("55") ? tel : `55${tel}`;
    window.open(`https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const marcar = async (id: string, status: "contatado" | "descartado") => {
    await fetch("/api/admin/carrinhos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setSacolas(atual => atual.filter(s => s.id !== id));
  };

  if (carregando) return <p style={{ color: "#9a8060" }}>Carregando...</p>;

  return (
    <>
      {desejadas.length > 0 && (
        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem", padding: "1.125rem 1.25rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1a1510", margin: "0 0 0.15rem" }}>
            Mais desejadas e não compradas
          </p>
          <p style={{ fontSize: "0.75rem", color: "#9a8060", margin: "0 0 0.75rem" }}>
            De {anonimas} {anonimas === 1 ? "sacola sem contato" : "sacolas sem contato"} — não dá para abordar, mas mostra o que está chamando atenção
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {desejadas.map(d => (
              <span key={d.nome} style={{ fontSize: "0.78rem", backgroundColor: "#FAF6EE", border: "1px solid rgba(140,100,20,0.15)", color: "#5a4a2a", padding: "0.3rem 0.7rem", borderRadius: "999px", fontWeight: 600 }}>
                {d.nome} <strong style={{ color: "#b8891a" }}>{d.vezes}x</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {sacolas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#9a8060", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          Nenhuma sacola abandonada com contato. 🎉
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {sacolas.map(s => (
            <div key={s.id} style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 800, color: "#1a1510", margin: 0, fontSize: "1rem" }}>{s.name || "Sem nome"}</p>
                  <p style={{ color: "#9a8060", fontSize: "0.8rem", margin: "0.15rem 0 0" }}>
                    {s.phone} · parou {quando(s.updatedAt)}
                  </p>
                </div>
                <p style={{ fontWeight: 900, color: "#b8891a", fontSize: "1.1rem", margin: 0 }}>{fmt(s.total)}</p>
              </div>

              <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem", color: "#5a4a2a", fontSize: "0.85rem" }}>
                {listaDeItens(s.items).map((i, n) => <li key={n} style={{ marginBottom: "0.15rem" }}>{i}</li>)}
              </ul>

              <div style={{ display: "flex", gap: "0.625rem", marginTop: "1rem", flexWrap: "wrap" }}>
                <button onClick={() => chamar(s)}
                  style={{ padding: "0.6rem 1.2rem", backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "0.625rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
                  📲 Chamar no WhatsApp
                </button>
                <button onClick={() => marcar(s.id, "contatado")}
                  style={{ padding: "0.6rem 1.2rem", backgroundColor: "#fff", color: "#5a4a2a", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  ✓ Já falei com ela
                </button>
                <button onClick={() => marcar(s.id, "descartado")}
                  style={{ padding: "0.6rem 1rem", backgroundColor: "#fff", color: "#9a8060", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
