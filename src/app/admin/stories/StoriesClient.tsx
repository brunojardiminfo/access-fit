"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { desenharStory, desenharEnquete, enviarStory } from "@/lib/storyCanvas";
import { whatsDaPeca, whatsDaEnquete } from "@/lib/loja";

type Peca = {
  id: string; nome: string; categoria: string | null; foto: string;
  preco: number; precoCheio: number; desconto: number; estoque: number;
};
type Passo = {
  slot: number; tipo: string; etiqueta: string; instrucao: string; texto: string;
  pecaId: string | null; dueloIds: [string, string] | null; avisoDeRepeticao: string | null;
};

const CARTAO = { backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem" } as const;
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const BOTAO = {
  fontSize: "0.75rem", fontWeight: 800, padding: "0.5rem 0.9rem",
  borderRadius: "0.6rem", border: "none", cursor: "pointer",
} as const;

/**
 * O dia em sete passos numerados.
 *
 * A VERSÃO ANTERIOR DAVA ESCOLHA, E A ESCOLHA ERA O TRABALHO. Três sugestões
 * com botão de "trocar" ainda deixavam a decisão de pé todo dia, e decisão
 * todo dia é o que faz parar de postar. Aqui ele abre e executa de 1 a 7.
 *
 * O PASSO FEITO SOME DO CAMINHO (fica cinza e encolhe) para o próximo ser
 * sempre o primeiro que ele vê.
 */
export default function StoriesClient({
  pecas, roteiro, dia, semana, postadosHoje, descanso,
}: {
  pecas: Peca[]; roteiro: Passo[];
  dia: { nome: string; tema: string; categorias: string[] };
  semana: { nome: string; tema: string; hoje: boolean }[];
  postadosHoje: number; descanso: number;
}) {
  const router = useRouter();
  const [feitos, setFeitos] = useState<Set<number>>(new Set());
  const [verTodas, setVerTodas] = useState(false);
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const porId = useMemo(() => new Map(pecas.map(p => [p.id, p])), [pecas]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pecas;
    return pecas.filter(p => p.nome.toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q));
  }, [pecas, busca]);

  /**
   * Registra a passagem pelo ar.
   *
   * Chamado ao gerar a imagem E ao marcar o passo — depender só do botão seria
   * depender de ele lembrar, e no dia que esquecesse a agenda congelava e
   * ofereceria as mesmas peças para sempre.
   */
  const registrar = async (slot: number, tipo: string, productId?: string | null) => {
    await fetch("/api/admin/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, kind: tipo, productId: productId || null }),
    }).catch(() => {});
  };

  const marcar = async (p: Passo) => {
    setFeitos(s => new Set(s).add(p.slot));
    await registrar(p.slot, p.tipo, p.pecaId);
    router.refresh();
  };

  const gerar = async (peca: Peca, passo?: Passo) => {
    setAviso(""); setOcupado(peca.id);
    try {
      const blob = await desenharStory(peca);
      const onde = await enviarStory(blob, `story-${peca.nome.toLowerCase().replace(/\s+/g, "-")}`);
      setAviso(onde === "compartilhado"
        ? "Story gerado — escolhe o Instagram no menu que abriu."
        : "Story baixado. No computador o compartilhamento direto não existe: o arquivo foi para os downloads.");
      await registrar(passo?.slot ?? 0, "peca", peca.id);
    } catch (e) {
      setAviso(`Não deu para gerar: ${(e as Error).message}`);
    }
    setOcupado(null);
  };

  const gerarEnquete = async (a: Peca, b: Peca, passo: Passo) => {
    setAviso(""); setOcupado(`enquete-${a.id}`);
    try {
      const blob = await desenharEnquete(a, b);
      const onde = await enviarStory(blob, "enquete-access-fit");
      setAviso(onde === "compartilhado"
        ? "Enquete gerada — põe a enquete do Instagram por cima, opções 1 e 2."
        : "Enquete baixada. Posta e põe a enquete do Instagram por cima, opções 1 e 2.");
      await registrar(passo.slot, "enquete", null);
    } catch (e) {
      setAviso(`Não deu para gerar: ${(e as Error).message}`);
    }
    setOcupado(null);
  };

  const copiar = async (texto: string, id: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 2000); }
    catch { prompt("Copie o texto:", texto); }
  };

  const total = roteiro.length;
  const prontos = Math.max(feitos.size, Math.min(postadosHoje, total));

  return (
    <div style={{ maxWidth: 820, margin: "0 auto",
      /* A folga embaixo é o dobro da altura do menu fixo do admin: sem ela o
         menu cobre o último botão e no celular ele fica inalcançável. */
      padding: "1.75rem 1.1rem 7rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin" style={{ color: "#b8891a", fontSize: "0.85rem", textDecoration: "none" }}>← Admin</a>

      <h1 style={{ color: "#1a1510", fontSize: "1.6rem", fontWeight: 900, margin: "0.2rem 0 0.2rem" }}>
        📱 {dia.nome}: {dia.tema}
      </h1>
      <p style={{ color: "#9a8060", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "0.9rem" }}>
        {total} stories, nesta ordem. {prontos > 0 ? `${prontos} de ${total} já foram.` : "Começa pelo 1."}
      </p>

      {/* ── a semana inteira, para ele saber o que vem ── */}
      <div style={{ display: "flex", gap: "0.3rem", overflowX: "auto", paddingBottom: "0.3rem", marginBottom: "1.1rem" }}>
        {semana.map(d => (
          <div key={d.nome} style={{
            flex: "1 0 auto", minWidth: 84, textAlign: "center", padding: "0.45rem 0.4rem",
            borderRadius: "0.6rem", backgroundColor: d.hoje ? "#1a1510" : "#fff",
            border: `1px solid ${d.hoje ? "#1a1510" : "rgba(140,100,20,0.14)"}`,
          }}>
            <div style={{ color: d.hoje ? "#e8c766" : "#9a8060", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {d.nome}
            </div>
            <div style={{ color: d.hoje ? "#f6f1e6" : "#5a4a2a", fontSize: "0.68rem", lineHeight: 1.25, marginTop: "0.15rem" }}>
              {d.tema}
            </div>
          </div>
        ))}
      </div>

      {aviso && (
        <div style={{ ...CARTAO, padding: "0.8rem 1rem", marginBottom: "1.1rem", backgroundColor: "#fff8e1", borderColor: "rgba(184,137,26,0.4)", color: "#5a4a2a", fontSize: "0.83rem" }}>
          {aviso}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.7rem" }}>
        {roteiro.map((passo, idx) => {
          const p = passo.pecaId ? porId.get(passo.pecaId) : undefined;
          const duo = passo.dueloIds
            ? [porId.get(passo.dueloIds[0]), porId.get(passo.dueloIds[1])].filter(Boolean) as Peca[]
            : [];
          const temDuo = duo.length === 2;
          const feito = feitos.has(passo.slot);
          /*
            A instrução das quatro peças é a mesma frase. Repetida quatro
            vezes ela deixa de ser instrução e vira parede de texto — que é
            exatamente o que fazia ele não achar nada na tela antiga. Aparece
            na primeira e some nas iguais seguintes.
          */
          const instrucaoNova = idx === 0 || roteiro[idx - 1].instrucao !== passo.instrucao;

          return (
            <div key={passo.slot} style={{
              ...CARTAO, overflow: "hidden", opacity: feito ? 0.5 : 1,
              borderColor: feito ? "rgba(26,138,42,0.4)" : CARTAO.border,
            }}>
              <div style={{ display: "flex", gap: "0.8rem", padding: "0.85rem 1rem", alignItems: "flex-start" }}>
                <div style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center",
                  backgroundColor: feito ? "#1a8a2a" : "#1a1510", color: feito ? "#fff" : "#e8c766",
                  fontWeight: 900, fontSize: "0.82rem",
                }}>
                  {feito ? "✓" : passo.slot}
                </div>

                {p && !feito && (
                  <img src={p.foto} alt="" style={{ width: 66, height: 88, objectFit: "cover", borderRadius: "0.6rem", flexShrink: 0 }} />
                )}
                {temDuo && !feito && (
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {duo.map((d, n) => (
                      <div key={d.id} style={{ position: "relative" }}>
                        <img src={d.foto} alt="" style={{ width: 46, height: 88, objectFit: "cover", borderRadius: n === 0 ? "0.6rem 0 0 0.6rem" : "0 0.6rem 0.6rem 0" }} />
                        <span style={{ position: "absolute", top: 3, left: "50%", transform: "translateX(-50%)", backgroundColor: "#e8c766", color: "#07060a", fontSize: "0.55rem", fontWeight: 900, width: 15, height: 15, borderRadius: 999, display: "grid", placeItems: "center" }}>
                          {n + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#9a8060", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {passo.etiqueta}
                    </span>
                    {p && <strong style={{ color: "#1a1510", fontSize: "0.86rem" }}>{p.nome}</strong>}
                    {temDuo && (
                      <strong style={{ color: "#1a1510", fontSize: "0.8rem" }}>
                        {duo[0].nome} <span style={{ color: "#9a8060", fontWeight: 600 }}>ou</span> {duo[1].nome}
                      </strong>
                    )}
                  </div>

                  {!feito && (
                    <>
                      {/* O aviso de repetição existe para ele não achar que é novidade. */}
                      {passo.avisoDeRepeticao && (
                        <div style={{ color: "#c08030", fontSize: "0.7rem", fontWeight: 700, marginTop: "0.25rem" }}>
                          ⚠ {passo.avisoDeRepeticao} — categoria pequena para {descanso} dias de descanso
                        </div>
                      )}
                      {instrucaoNova && (
                        <div style={{ color: "#9a8060", fontSize: "0.72rem", lineHeight: 1.45, margin: "0.3rem 0 0.45rem" }}>
                          {passo.instrucao}
                        </div>
                      )}
                      <div style={{ color: "#3a2a10", fontSize: "0.83rem", lineHeight: 1.5, backgroundColor: "#FAF6EE", padding: "0.55rem 0.7rem", borderRadius: "0.6rem" }}>
                        {passo.texto}
                      </div>

                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                        {p && (
                          <button onClick={() => gerar(p, passo)} disabled={ocupado === p.id} data-passo="peca"
                            style={{ ...BOTAO, backgroundColor: "#b8891a", color: "#fff", cursor: ocupado === p.id ? "wait" : "pointer" }}>
                            {ocupado === p.id ? "montando…" : "Gerar imagem"}
                          </button>
                        )}
                        {temDuo && (
                          <button onClick={() => gerarEnquete(duo[0], duo[1], passo)} disabled={ocupado === `enquete-${duo[0].id}`} data-passo="enquete"
                            style={{ ...BOTAO, backgroundColor: "#b8891a", color: "#fff" }}>
                            {ocupado === `enquete-${duo[0].id}` ? "montando…" : "Gerar imagem"}
                          </button>
                        )}
                        {/*
                          No story de peça o texto já está na imagem: ali o que
                          falta é o link do sticker, que faz a conversa chegar
                          com o nome da peça dentro. Onde não há imagem, o
                          texto é tudo o que ele tem.
                        */}
                        {(p || temDuo) ? (
                          <button onClick={() => copiar(
                            p ? whatsDaPeca(p.nome) : whatsDaEnquete(duo[0].nome, duo[1].nome), `zap-${passo.slot}`)}
                            style={{ ...BOTAO, fontWeight: 700, border: "1px solid rgba(37,211,102,0.5)", backgroundColor: "#eafaf0", color: "#0b6b35" }}>
                            {copiado === `zap-${passo.slot}` ? "✓ link copiado" : "Copiar link do WhatsApp"}
                          </button>
                        ) : (
                          <button onClick={() => copiar(passo.texto, `txt-${passo.slot}`)}
                            style={{ ...BOTAO, fontWeight: 700, border: "1px solid rgba(140,100,20,0.25)", backgroundColor: "#FAF6EE", color: "#5a4a2a" }}>
                            {copiado === `txt-${passo.slot}` ? "✓ copiado" : "Copiar texto"}
                          </button>
                        )}
                        <button onClick={() => marcar(passo)}
                          style={{ ...BOTAO, fontWeight: 700, background: "none", color: "#9a8060", textDecoration: "underline" }}>
                          postei
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── A grade das peças fica guardada: ela é a exceção, não o caminho ── */}
      <button onClick={() => setVerTodas(!verTodas)}
        style={{ width: "100%", marginTop: "1.25rem", padding: "0.8rem", borderRadius: "0.8rem", border: "1px dashed rgba(140,100,20,0.35)", backgroundColor: "transparent", color: "#9a8060", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
        {verTodas ? "▲ fechar" : `▼ Postar outra peça (${pecas.length} com foto)`}
      </button>

      {verTodas && (
        <div style={{ marginTop: "1rem" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar peça ou categoria…"
            style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.7rem", fontSize: "0.85rem", backgroundColor: "#fff", outline: "none", marginBottom: "0.9rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.8rem" }}>
            {lista.map(p => (
              <button key={p.id} onClick={() => gerar(p)} disabled={ocupado === p.id}
                style={{ ...CARTAO, padding: 0, overflow: "hidden", cursor: ocupado === p.id ? "wait" : "pointer", textAlign: "left", display: "block" }}>
                <div style={{ position: "relative", aspectRatio: "3/4", backgroundColor: "#f0e8d0" }}>
                  <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.desconto > 0 && (
                    <span style={{ position: "absolute", top: 7, left: 7, backgroundColor: "#c04040", color: "#fff", fontSize: "0.6rem", fontWeight: 900, padding: "0.12rem 0.45rem", borderRadius: 999 }}>
                      -{p.desconto}%
                    </span>
                  )}
                  {p.estoque <= 2 && (
                    <span style={{ position: "absolute", top: 7, right: 7, backgroundColor: "#1a1510", color: "#e8c766", fontSize: "0.58rem", fontWeight: 900, padding: "0.12rem 0.45rem", borderRadius: 999 }}>
                      {p.estoque} un
                    </span>
                  )}
                </div>
                <div style={{ padding: "0.55rem 0.65rem" }}>
                  <div style={{ color: "#1a1510", fontWeight: 700, fontSize: "0.78rem", lineHeight: 1.25 }}>{p.nome}</div>
                  <div style={{ color: p.desconto > 0 ? "#c04040" : "#b8891a", fontWeight: 900, fontSize: "0.82rem", marginTop: "0.18rem" }}>
                    {moeda(p.preco)}
                    {p.desconto > 0 && (
                      <s style={{ color: "#b8a080", fontWeight: 600, fontSize: "0.7rem", marginLeft: "0.3rem" }}>{moeda(p.precoCheio)}</s>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
