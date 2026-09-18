import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./party-upgrade.css";
import "./dumbuk-games.css";
import "./dumbuk-ludo.css";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffbef",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "DÜMBÜK — Ekip tamam mı?", template: "%s | DÜMBÜK" },
  applicationName: "DÜMBÜK",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.ico", sizes: "16x16 32x32 48x48" }, { url: "/brand/favicon.svg", type: "image/svg+xml" }], apple: "/brand/apple-touch-icon.png" },
  openGraph: { title: "DÜMBÜK — Ekip tamam mı?", description: "Odayı aç. Tayfayı çağır. KADRO, Kızma Birader, TAŞIR ve daha fazlası.", siteName: "DÜMBÜK", locale: "tr_TR", type: "website", images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "DÜMBÜK — Muhabbet baki. Skor geçici." }] },
  twitter: { card: "summary_large_image", title: "DÜMBÜK — Ekip tamam mı?", images: ["/opengraph-image.png"] },
  description: "Odayı aç. Tayfayı çağır. KADRO, Kızma Birader, TAŞIR ve Microgame Royale: arkadaşlarınla tarayıcıdan oyna.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
