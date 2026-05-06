import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 初始化数据库（服务端执行）
if (typeof window === "undefined") {
  const { initDb } = require("@/lib/db/index");
  initDb();
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReplyGuy - X Comment Generator",
  description: "Paste a tweet, pick a persona, generate human-like comments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
