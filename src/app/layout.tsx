import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeSync Memory App",
  description: "Memories that matter. Life in sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
