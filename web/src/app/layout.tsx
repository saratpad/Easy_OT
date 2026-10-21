import type { Metadata } from "next";
import { Sarabun, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

import { fetchSystemSettings } from "./actions/admin";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSystemSettings();
  const systemName = settings['app_name'] || "Easy OT — ระบบขออนุมัติการทำงานล่วงเวลา";
  const systemLogoUrl = settings['logo_url'] || "/favicon.ico";

  return {
    title: {
      template: `%s | ${systemName}`,
      default: systemName,
    },
    description: "ระบบขออนุมัติและรับรองการทำงานล่วงเวลา (Easy OT)",
    icons: {
      icon: [
        { url: `/api/icon?v=${Date.now()}`, type: 'image/png', sizes: '32x32' }
      ],
      shortcut: `/api/icon?v=${Date.now()}`,
      apple: `/api/icon?v=${Date.now()}`,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50/70 text-slate-800 selection:bg-blue-500/20 selection:text-blue-700">
        {children}
      </body>
    </html>
  );
}
