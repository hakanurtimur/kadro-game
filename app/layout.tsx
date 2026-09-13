import type { Metadata } from "next";
import "./globals.css";
import "./party-upgrade.css";

export const metadata: Metadata = {
  title: "KADRO! — AI Auction Party Game",
  description: "Karakterleri açık artırmada kap, kadronu kur, AI jüriyi ikna et.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
