import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EvalIA — Evaluación oral con IA",
  description: "Plataforma de entrevistas y evaluaciones con voz para equipos y candidatos.",
  icons: {
    icon: "/logo-evalia.png",
    apple: "/logo-evalia.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased selection:bg-violet-200/70 selection:text-violet-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
