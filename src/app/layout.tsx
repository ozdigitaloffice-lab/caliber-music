import type { Metadata, Viewport } from "next";
import { Heebo, Suez_One, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Grain } from "@/components/Grain";
import { ScrollProgress } from "@/components/ScrollProgress";
import { MotionShell } from "@/components/MotionShell";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});
const suez = Suez_One({
  variable: "--font-display",
  subsets: ["hebrew", "latin"],
  weight: "400", // Suez One is single-weight slab — heavy by design
  display: "swap",
});
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "משפחת קליבר · Caliber Family",
  description: "היפ הופ • טראפ • אורבני — 17 סינגלים. Spotify · Apple Music · YouTube.",
  openGraph: {
    title: "משפחת קליבר · Caliber Family",
    description: "היפ הופ • טראפ • אורבני",
    type: "profile",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${suez.variable} ${grotesk.variable} ${mono.variable} antialiased`}
    >
      <body className="min-h-screen bg-[var(--color-bg)] pt-[58px] text-[var(--color-fg)] md:pt-[64px]">
        <SmoothScroll />
        <ScrollProgress />
        <Grain />
        <MotionShell>{children}</MotionShell>
      </body>
    </html>
  );
}
