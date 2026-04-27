import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SpaceBackground } from "@/components/fx/space-background";
import { CursorGlow } from "@/components/fx/cursor-glow";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SofiaAI — Agentes de voz IA",
  description:
    "Sofia contesta tus llamadas, califica leads, agenda citas y actualiza tu CRM con inteligencia artificial.",
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
      <body className="min-h-full flex flex-col font-sans bg-neutral-950 text-neutral-50 relative">
        {/* Premium space FX — sit behind everything */}
        <SpaceBackground />
        <CursorGlow />
        {/* Content stays above (z-10) */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
