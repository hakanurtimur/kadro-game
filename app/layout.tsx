import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./party-upgrade.css";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "KADRO! Oyun Masası",
  description: "KADRO veya Kızma Birader: arkadaşlarınla tarayıcıdan anında oyna.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
