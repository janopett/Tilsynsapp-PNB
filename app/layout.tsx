import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tilsynsapp – Plan & Bygg",
  description: "Tilsynsverktøy for byggesaker med automatisk arkivering til Plan & Build",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
