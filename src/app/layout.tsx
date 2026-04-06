import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Zen_Maru_Gothic } from "next/font/google";
import { BottomNavigation } from "@/components/navigation";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["500", "700"],
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
  themeColor: "#1a1a2e",
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
    <html
      lang="ja"
      className={`${geistSans.variable} ${zenMaruGothic.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="flex min-h-dvh flex-col bg-fantasy">
        <main className="flex-1 pb-16">{children}</main>
        <BottomNavigation />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
