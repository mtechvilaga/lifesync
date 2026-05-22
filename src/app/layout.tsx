import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeSync App",
  description: "Memories that matter. Life in sync.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeSync",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <head>
        {/* PWA iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LifeSync" />

        {/* iOS ikon – transparent háttér, nem nyomja össze */}
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />

        {/* Splash screen háttérszín – ne legyen fehér */}
        <meta name="theme-color" content="#1a1f3a" />
        <meta name="msapplication-navbutton-color" content="#1a1f3a" />

        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
