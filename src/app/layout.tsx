import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNavigation } from "@/components/navigation";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "おさんぽクエスト",
  description: "神様のお使いで散歩が冒険に変わる",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "おさんぽクエスト",
  },
};

export const viewport: Viewport = {
  themeColor: "#6B8E7B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="flex min-h-dvh flex-col bg-[#FFF8F0]">
        <main className="flex-1 pb-16">{children}</main>
        <BottomNavigation />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
