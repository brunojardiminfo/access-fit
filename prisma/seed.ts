import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

/**
 * Senha do admin. Vem de ADMIN_PASSWORD; sem ela, o seed sorteia uma senha
 * forte e imprime uma unica vez. Nunca deixe uma senha fixa aqui: este arquivo
 * fica no repositorio, e o painel admin abre pedidos, clientes e financeiro.
 */
function senhaDoAdmin(): { senha: string; sorteada: boolean } {
  const doAmbiente = process.env.ADMIN_PASSWORD?.trim();
  if (doAmbiente) return { senha: doAmbiente, sorteada: false };
  return { senha: randomBytes(12).toString("base64url"), sorteada: true };
}

async function main() {
  // Admin user
  const email = process.env.ADMIN_EMAIL?.trim() || "admin@accessfit.com.br";
  const { senha, sorteada } = senhaDoAdmin();
  const hashedPassword = await bcrypt.hash(senha, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin Access Fit",
      email,
      password: hashedPassword,
      role: "admin",
    },
  });
  if (sorteada) {
    console.log(`\n  Admin criado: ${email}\n  Senha sorteada: ${senha}\n  Anote agora — ela nao e exibida de novo. Para definir a sua, use ADMIN_PASSWORD.\n`);
  }

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "leggings" },
      update: {},
      create: { name: "Leggings", slug: "leggings", image: "/categories/leggings.jpg" },
    }),
    prisma.category.upsert({
      where: { slug: "tops" },
      update: {},
      create: { name: "Tops", slug: "tops", image: "/categories/tops.jpg" },
    }),
    prisma.category.upsert({
      where: { slug: "conjuntos" },
      update: {},
      create: { name: "Conjuntos", slug: "conjuntos", image: "/categories/conjuntos.jpg" },
    }),
    prisma.category.upsert({
      where: { slug: "shorts" },
      update: {},
      create: { name: "Shorts", slug: "shorts", image: "/categories/shorts.jpg" },
    }),
    prisma.category.upsert({
      where: { slug: "calcas" },
      update: {},
      create: { name: "Calças", slug: "calcas", image: "/categories/calcas.jpg" },
    }),
  ]);

  const [leggings, tops, conjuntos, shorts] = categories;

  // Products
  const products = [
    {
      name: "Legging Sculpt Cintura Alta",
      slug: "legging-sculpt-cintura-alta",
      description: "Legging de cintura alta com efeito modelador e compressão suave. Tecido com UV50+ e secagem rápida.",
      price: 149.9,
      compareAt: 189.9,
      images: JSON.stringify(["/products/legging-sculpt-1.jpg", "/products/legging-sculpt-2.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G", "GG"]),
      colors: JSON.stringify(["Preto", "Rosa", "Vinho"]),
      stock: 50,
      featured: true,
      categoryId: leggings.id,
    },
    {
      name: "Legging Push Up Fitness",
      slug: "legging-push-up-fitness",
      description: "Legging com costura estratégica que valoriza os glúteos. Ideal para treinos intensos.",
      price: 159.9,
      compareAt: null,
      images: JSON.stringify(["/products/legging-pushup-1.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G", "GG"]),
      colors: JSON.stringify(["Preto", "Grafite", "Azul Marinho"]),
      stock: 30,
      featured: true,
      categoryId: leggings.id,
    },
    {
      name: "Top Nadador Com Bojo",
      slug: "top-nadador-com-bojo",
      description: "Top estilo nadador com bojo removível e tiras ajustáveis. Suporte médio para treinos.",
      price: 89.9,
      compareAt: 109.9,
      images: JSON.stringify(["/products/top-nadador-1.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G", "GG"]),
      colors: JSON.stringify(["Rosa", "Preto", "Branco"]),
      stock: 45,
      featured: true,
      categoryId: tops.id,
    },
    {
      name: "Top Cropped Sporty",
      slug: "top-cropped-sporty",
      description: "Top cropped com estampa exclusiva Access Fit. Leveza e estilo para o dia a dia.",
      price: 79.9,
      compareAt: null,
      images: JSON.stringify(["/products/top-cropped-1.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G"]),
      colors: JSON.stringify(["Rosa Neon", "Preto", "Lilás"]),
      stock: 60,
      featured: false,
      categoryId: tops.id,
    },
    {
      name: "Conjunto Fitness Essential",
      slug: "conjunto-fitness-essential",
      description: "Conjunto top + legging com design minimalista e tecido premium. Perfeito para academia e pilates.",
      price: 229.9,
      compareAt: 279.9,
      images: JSON.stringify(["/products/conjunto-essential-1.jpg", "/products/conjunto-essential-2.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G", "GG"]),
      colors: JSON.stringify(["Rosa/Preto", "All Black", "Bege/Caramelo"]),
      stock: 25,
      featured: true,
      categoryId: conjuntos.id,
    },
    {
      name: "Conjunto Tie Dye Summer",
      slug: "conjunto-tie-dye-summer",
      description: "Conjunto tie dye vibrante para treinos e looks casuais. Tecido leve e fresquinho.",
      price: 199.9,
      compareAt: 249.9,
      images: JSON.stringify(["/products/conjunto-tiedye-1.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G"]),
      colors: JSON.stringify(["Rosa/Roxo", "Azul/Verde"]),
      stock: 20,
      featured: false,
      categoryId: conjuntos.id,
    },
    {
      name: "Short Fitness Bolso",
      slug: "short-fitness-bolso",
      description: "Short com cós elástico e bolso lateral funcional. Tecido dry fit de alta qualidade.",
      price: 99.9,
      compareAt: null,
      images: JSON.stringify(["/products/short-bolso-1.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G", "GG"]),
      colors: JSON.stringify(["Preto", "Rosa", "Cinza"]),
      stock: 40,
      featured: false,
      categoryId: shorts.id,
    },
    {
      name: "Short Saia Fitness",
      slug: "short-saia-fitness",
      description: "Short saia 2 em 1 com visual feminino e praticidade para a academia.",
      price: 109.9,
      compareAt: 129.9,
      images: JSON.stringify(["/products/short-saia-1.jpg"]),
      sizes: JSON.stringify(["PP", "P", "M", "G"]),
      colors: JSON.stringify(["Rosa", "Preto", "Branco"]),
      stock: 35,
      featured: false,
      categoryId: shorts.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
