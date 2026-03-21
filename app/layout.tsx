import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "next-themes";

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
    <html lang="nb" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Skip navigation — WCAG 2.4.1 */}
          <a href="#main-content" className="skip-link">
            Hopp til innhold
          </a>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
