import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SpaceBackground } from "@/components/fx/space-background";
import { CursorGlow } from "@/components/fx/cursor-glow";
import { ModalPrewarm } from "@/components/fx/modal-prewarm";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quantixa AI — Agentes de voz y WhatsApp con IA",
  description:
    "Quantixa AI contesta tus llamadas, automatiza WhatsApp, califica leads y agenda citas con inteligencia artificial. 14 días gratis.",
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
        <ModalPrewarm />
        {/* Content stays above (z-10) */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
