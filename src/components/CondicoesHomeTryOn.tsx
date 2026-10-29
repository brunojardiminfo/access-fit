import { CONDICOES_HOME_TRY_ON } from "@/lib/homeTryOn";

/**
 * O bloco de condições do Home Try-On na nota.
 *
 * Duas variantes porque as notas vivem em mundos de cor diferentes: a da loja
 * é feita para imprimir no papel (fundo branco, cores fixas) e a que a cliente
 * abre segue o tema escuro do site (cores por variável). Uma só serviria mal
 * em uma das duas.
 *
 * Não é "letra miúda": fica no corpo da nota, no mesmo tamanho do resto. A
 * cliente precisa ler isto antes de sair com a sacola, não depois.
 */
export default function CondicoesHomeTryOn({ variante }: { variante: "papel" | "tela" }) {
  const papel = variante === "papel";
  const cor = {
    borda: papel ? "#f0e8d0" : "var(--border)",
    fundo: papel ? "#fffaf0" : "rgba(184,137,26,0.08)",
    titulo: papel ? "#9a8060" : "var(--text-muted)",
    texto: papel ? "#5a4a2a" : "var(--text-sub)",
    marca: papel ? "#b8891a" : "var(--gold)",
  };

  return (
    <div style={{
      marginTop: "1.5rem", padding: "1rem 1.15rem",
      backgroundColor: cor.fundo, border: `1px solid ${cor.borda}`, borderRadius: "0.75rem",
    }}>
      <p style={{
        fontSize: "0.7rem", fontWeight: 700, color: cor.titulo,
        letterSpacing: "0.08em", marginBottom: "0.55rem",
      }}>
        CONDIÇÕES DO HOME TRY-ON
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {CONDICOES_HOME_TRY_ON.map(linha => (
          <li key={linha} style={{ fontSize: "0.85rem", color: cor.texto, lineHeight: 1.5 }}>
            {linha}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: "0.75rem", color: cor.marca, marginTop: "0.65rem", fontWeight: 600 }}>
        Qualquer dúvida, é só chamar no WhatsApp. 💛
      </p>
    </div>
  );
}
