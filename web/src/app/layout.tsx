import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

import { fetchSystemSettings } from "./actions/admin";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSystemSettings();
  const systemName = settings['app_name'] || "Overtime Approval System";
  const systemLogoUrl = settings['logo_url'] || "/favicon.ico";

  return {
    title: systemName,
    description: "ระบบขออนุมัติการทำงานล่วงเวลา",
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
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-gray-50">{children}</body>
    </html>
  );
}
