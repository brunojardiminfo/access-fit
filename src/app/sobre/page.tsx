import Link from "next/link";
import Image from "next/image";
import { Anton } from "next/font/google";

const anton = Anton({ subsets: ["latin"], weight: "400" });

export const metadata = {
  title: "Sobre Nós — Access Fit",
  description: "Conheça a Access Fit e o conceito Home Try-On: você experimenta no conforto de onde quiser e compra só se gostar.",
};

const StarDecor = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" style={{ position: "absolute", opacity: 0.07, pointerEvents: "none" }}>
    <path d="M90 20 L93 32 L106 35 L93 38 L90 50 L87 38 L74 35 L87 32 Z" fill="var(--gold)"/>
    <path d="M140 60 L142 68 L150 70 L142 72 L140 80 L138 72 L130 70 L138 68 Z" fill="var(--gold)"/>
    <path d="M50 100 L52 108 L60 110 L52 112 L50 120 L48 112 L40 110 L48 108 Z" fill="var(--gold)"/>
    <circle cx="155" cy="120" r="3" fill="var(--gold)"/>
    <circle cx="30" cy="60" r="2" fill="var(--gold)"/>
    <circle cx="120" cy="150" r="2.5" fill="var(--gold)"/>
    <path d="M20 160 Q80 80 160 100" stroke="var(--gold)" strokeWidth="1" fill="none"/>
  </svg>
);

export default function SobrePage() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", backgroundColor: "var(--bg-dark)", padding: "5rem 1.5rem" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
          <svg width="100%" height="100%"><defs><pattern id="stars" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M40 10 L41.5 16 L48 17.5 L41.5 19 L40 25 L38.5 19 L32 17.5 L38.5 16 Z" fill="var(--gold)"/><circle cx="15" cy="40" r="1.5" fill="var(--gold)"/><circle cx="65" cy="60" r="1" fill="var(--gold)"/><circle cx="70" cy="20" r="1.2" fill="var(--gold)"/></pattern></defs><rect width="100%" height="100%" fill="url(#stars)"/></svg>
        </div>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <div style={{ width: 110, height: 110, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
              <Image src="/logo.png" alt="Access Fit" width={110} height={110} style={{ objectFit: "cover", transform: "scale(1.08)" }} />
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--gold)", fontWeight: 700, letterSpacing: "0.2em", marginBottom: "1rem" }}>ACCESS FIT</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "var(--text-main)", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Moda fitness que cabe<br />
            <span style={{ background: "linear-gradient(135deg, #c9920a, #e0b030)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              no seu estilo de vida
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Nascemos da paixão por moda fitness feminina com propósito — peças que combinam conforto, qualidade e elegância para quem não abre mão de se sentir bem em movimento.
          </p>
        </div>
      </section>

      {/* Nossa História */}
      <section style={{ padding: "4.5rem 1.5rem 3rem" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>

          <div className="historia-intro" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2.5rem", alignItems: "center", marginBottom: "3rem" }}>
            <div>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "0.75rem" }}>NOSSA HISTÓRIA</p>
              <h2 className={anton.className} style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", color: "var(--text-main)", lineHeight: 0.95, marginBottom: "1.25rem", letterSpacing: "0.01em" }}>
                BRUNO &amp; BRUNA
              </h2>
              <p style={{ color: "var(--text-sub)", fontSize: "1rem", lineHeight: 1.8, maxWidth: 480 }}>
                Juntos há 4 anos, sempre em busca de evolução — os dois nomes por trás de cada peça da Access Fit.
              </p>
            </div>
            <div style={{ position: "relative", width: 180, aspectRatio: "3/4", flexShrink: 0, justifySelf: "center", borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 12px 30px rgba(26,21,16,0.25)", transform: "rotate(-2deg)", border: "6px solid #fff" }}>
              <Image src="/sobre/hero-quem-somos.jpg" alt="Bruno e Bruna, fundadores da Access Fit, em treino na barra" fill style={{ objectFit: "cover" }} sizes="180px" />
            </div>
          </div>

          <RigDivider />

          <FounderBlock
            name="BRUNO"
            age="30 anos"
            role="TI e empreendedor de alma"
            tag="Crossfiteiro e multi esportista"
            bio={[
              "Tecnologia corre nas veias desde sempre. Já empreendeu em moda masculina e e-commerce de telefones, mas foi no esporte que encontrou seu propósito de vida.",
              "Ariano nato, observador e direto na régua: acredita que o esporte salva vidas. Vive o equilíbrio perfeito entre se permitir e se cuidar — porque lifestyle saudável não é restrição, é liberdade.",
            ]}
            mainPhoto="/sobre/bruno-principal.jpg"
            sidePhotos={["/sobre/bruno-corrida.jpg", "/sobre/bruno-treino.jpg"]}
          />

          <RigDivider />

          <FounderBlock
            reverse
            name="BRUNA"
            age="27 anos"
            role="Enfermeira amante da vida"
            tag="Apaixonada pelas redes, espiritualidade e wellness"
            bio={[
              "Nunca pensou em empreender, até que a vida mostrou outro caminho. Passou por uma transformação de -15kg ao tratar um lipedema — e junto vieram autoestima, saúde e propósito.",
              "Compartilha seu lifestyle, looks e paixão por terapias holísticas. Crossfiteira de coração e pregadora oficial do esporte, acredita no poder da energia e do movimento.",
            ]}
            mainPhoto="/sobre/bruna-principal.jpg"
            sidePhotos={["/sobre/bruna-enfermeira.jpg", "/sobre/bruna-look.jpg"]}
          />

          <RigDivider />

          <div className="historia-fundacao" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2.5rem", alignItems: "center" }}>
            <div style={{ position: "relative", width: 150, aspectRatio: "112/200", flexShrink: 0, justifySelf: "center", borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 12px 30px rgba(26,21,16,0.25)", transform: "rotate(3deg)", border: "6px solid #fff" }}>
              <Image src="/sobre/casal.jpg" alt="Bruno e Bruna" fill style={{ objectFit: "cover" }} sizes="150px" />
            </div>
            <div>
              <p style={{ color: "var(--text-sub)", fontSize: "1rem", lineHeight: 1.8, marginBottom: "1rem" }}>
                Decidimos unir a paixão da Bruna por moda fitness e terapias holísticas com a experiência do Bruno em tecnologia e empreendedorismo.
              </p>
              <p style={{ color: "var(--text-sub)", fontSize: "1rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                Nasceu assim a <strong style={{ color: "var(--text-main)" }}>Access Fit</strong>: roupas de treino que te dão conforto e beleza até nos treinos mais intensos, trazendo a essência das barras de access — uma terapia holística que transforma.
              </p>
              <p style={{ fontStyle: "italic", color: "var(--gold)", fontWeight: 700, fontSize: "0.95rem" }}>
                Idealizado com muito carinho para todas vocês.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Home Try-On */}
      <section style={{ padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <StarDecor />
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "0.75rem" }}>NOSSO DIFERENCIAL</p>
              <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 900, color: "var(--text-main)", lineHeight: 1.15, marginBottom: "1.25rem" }}>
                Home<br />Try-On
              </h2>
              <p style={{ color: "var(--text-sub)", fontSize: "1rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                Acreditamos que a melhor forma de escolher uma peça é experimentá-la com calma, no conforto da sua casa ou onde você preferir.
              </p>
              <p style={{ color: "var(--text-sub)", fontSize: "1rem", lineHeight: 1.8 }}>
                Por isso criamos o <strong style={{ color: "var(--text-main)" }}>Home Try-On</strong>: você recebe as peças, experimenta com tranquilidade e paga <strong style={{ color: "var(--text-main)" }}>somente pelo que ficou</strong>. Sem pressão, sem complicação.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { emoji: "🚀", title: "Receba em mãos", desc: "Entregamos as peças pessoalmente para você experimentar sem sair de casa." },
                { emoji: "👗", title: "Experimente à vontade", desc: "Você tem tempo para provar, combinar e decidir com calma." },
                { emoji: "✅", title: "Pague só o que ficou", desc: "Gostou? Fica. Não curtiu? Devolve. Simples assim." },
              ].map(item => (
                <div key={item.title} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", alignItems: "flex-start", boxShadow: "0 2px 8px var(--border)" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{item.emoji}</span>
                  <div>
                    <p style={{ fontWeight: 800, color: "var(--text-main)", marginBottom: "0.25rem" }}>{item.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section style={{ backgroundColor: "var(--bg-card)", padding: "4rem 1.5rem", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "0.75rem" }}>NOSSOS VALORES</p>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: "var(--text-main)", marginBottom: "3rem" }}>
            O que nos move
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
            {[
              { emoji: "✨", title: "Qualidade", desc: "Selecionamos cada peça com atenção ao caimento, tecido e acabamento." },
              { emoji: "💛", title: "Confiança", desc: "Uma relação próxima com cada cliente, com cuidado e transparência." },
              { emoji: "🌟", title: "Estilo", desc: "Moda fitness que vai da academia ao dia a dia com elegância." },
              { emoji: "🚚", title: "Entrega em todo o Brasil", desc: "Baseadas em Porto Alegre, RS, mas enviamos para qualquer lugar do país." },
            ].map(v => (
              <div key={v.title} style={{ padding: "0.5rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{v.emoji}</div>
                <h3 style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1rem", marginBottom: "0.5rem" }}>{v.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: "var(--text-main)", marginBottom: "1rem" }}>
            Pronta para experimentar?
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            Conheça nossa coleção e descubra peças feitas para você se sentir incrível — no treino e além dele.
          </p>
          <Link href="/produtos"
            style={{ display: "inline-block", backgroundColor: "var(--gold)", color: "#16110b", fontWeight: 800, fontSize: "1rem", padding: "0.875rem 2.5rem", borderRadius: "0.875rem", textDecoration: "none", boxShadow: "0 4px 16px rgba(184,137,26,0.3)" }}>
            Ver coleção
          </Link>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .historia-intro, .historia-fundacao, .founder-block {
            grid-template-columns: 1fr !important;
            text-align: center;
            gap: 1.75rem !important;
          }
          .founder-block p {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function RigDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", margin: "3rem 0" }} aria-hidden="true">
      <span style={{ width: 13, height: 13, borderRadius: "50%", background: "#a8402c", flexShrink: 0 }} />
      <span style={{ flex: 1, maxWidth: 200, height: 6, borderRadius: 999, background: "linear-gradient(90deg, #a8402c, #c96a4a)" }} />
      <span style={{ width: 13, height: 13, borderRadius: "50%", background: "#a8402c", flexShrink: 0 }} />
    </div>
  );
}

function FounderPhotos({ main, side }: { main: string; side: [string, string] }) {
  return (
    <div style={{ position: "relative", width: 210, height: 260, flexShrink: 0, justifySelf: "center", margin: "0 auto" }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 92, aspectRatio: "3/4", borderRadius: "0.5rem", overflow: "hidden", border: "5px solid #fff", boxShadow: "0 8px 18px rgba(26,21,16,0.2)", transform: "rotate(-8deg)", zIndex: 1 }}>
        <Image src={side[0]} alt="" fill style={{ objectFit: "cover" }} sizes="92px" />
      </div>
      <div style={{ position: "absolute", right: 0, bottom: -6, width: 92, aspectRatio: "3/4", borderRadius: "0.5rem", overflow: "hidden", border: "5px solid #fff", boxShadow: "0 8px 18px rgba(26,21,16,0.2)", transform: "rotate(8deg)", zIndex: 1 }}>
        <Image src={side[1]} alt="" fill style={{ objectFit: "cover" }} sizes="92px" />
      </div>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%) rotate(-2deg)", width: 160, aspectRatio: "4/5", borderRadius: "0.75rem", overflow: "hidden", border: "6px solid #fff", boxShadow: "0 14px 28px rgba(26,21,16,0.28)", zIndex: 2 }}>
        <Image src={main} alt="" fill style={{ objectFit: "cover" }} sizes="160px" />
      </div>
    </div>
  );
}

function FounderBlock({ name, age, role, tag, bio, mainPhoto, sidePhotos, reverse }: {
  name: string;
  age: string;
  role: string;
  tag: string;
  bio: string[];
  mainPhoto: string;
  sidePhotos: [string, string];
  reverse?: boolean;
}) {
  const text = (
    <div>
      <h3 className={anton.className} style={{ fontSize: "clamp(2.25rem, 4.5vw, 3rem)", color: "var(--text-main)", lineHeight: 1, marginBottom: "0.35rem", letterSpacing: "0.01em" }}>
        {name}
      </h3>
      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
        {age.toUpperCase()} · {role}
      </p>
      <p style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.85rem", fontStyle: "italic", marginBottom: "1.1rem" }}>{tag}</p>
      {bio.map((p, i) => (
        <p key={i} style={{ color: "var(--text-sub)", fontSize: "0.975rem", lineHeight: 1.8, marginBottom: i < bio.length - 1 ? "0.9rem" : 0 }}>{p}</p>
      ))}
    </div>
  );

  return (
    <div className="founder-block" style={{ display: "grid", gridTemplateColumns: reverse ? "1fr auto" : "auto 1fr", gap: "2.5rem", alignItems: "center", marginBottom: "3.5rem" }}>
      {reverse ? (
        <>
          {text}
          <FounderPhotos main={mainPhoto} side={sidePhotos} />
        </>
      ) : (
        <>
          <FounderPhotos main={mainPhoto} side={sidePhotos} />
          {text}
        </>
      )}
    </div>
  );
}
