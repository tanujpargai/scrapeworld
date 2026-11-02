import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SidebarAndStatus from "./components/SidebarAndStatus";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCRAPE WORLD - Operator Console",
  description: "Internal operations and lead intelligence dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#09090B] text-[#FAFAFA]">
        <SidebarAndStatus>{children}</SidebarAndStatus>
      </body>
    </html>
  );
}
