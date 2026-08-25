import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import CampanhaBar from "@/components/layout/CampanhaBar";
import NotificationSubscriber from "@/components/NotificationSubscriber";
import { SessionProvider } from "next-auth/react";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Access Fit — Desbloqueie sua energia infinita",
  description: "Moda fitness feminina com estilo, conforto e qualidade. Leggings, tops, conjuntos e mais.",
  icons: { icon: "/favicon.ico", apple: "/logo.png" },
  metadataBase: new URL("https://www.accessfit.com.br"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.accessfit.com.br",
    siteName: "Access Fit",
    title: "Access Fit — Desbloqueie sua energia infinita",
    description: "Moda fitness feminina com estilo, conforto e qualidade. Leggings, tops, conjuntos e mais.",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Access Fit" }],
  },
  twitter: {
    card: "summary",
    title: "Access Fit",
    description: "Moda fitness feminina com estilo, conforto e qualidade.",
    images: ["/logo.png"],
  },
  alternates: { canonical: "https://www.accessfit.com.br" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAdmin = pathname.startsWith("/admin");
  // No checkout a barra sai de cena: o link do WhatsApp tiraria a cliente
  // da finalização do pedido
  const isCheckout = pathname.startsWith("/checkout");

  return (
    <html lang="pt-BR">
      <body className={inter.className} style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <SessionProvider>
          <NotificationSubscriber />
          {!isAdmin && <Header />}
          {!isAdmin && !isCheckout && <CampanhaBar />}
          <main style={{ flex: 1 }}>{children}</main>
          {!isAdmin && <Footer />}
          {!isAdmin && <CartDrawer />}
          {!isAdmin && <WhatsAppButton />}
        </SessionProvider>
      </body>
    </html>
  );
}
// rebuild
