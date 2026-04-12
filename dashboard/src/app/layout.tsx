import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sofía AI — Dashboard",
  description: "Panel de control del agente de voz para Inmobiliaria Horizontes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${playfair.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-neutral-950 text-neutral-50">
        {children}
      </body>
    </html>
  );
}
