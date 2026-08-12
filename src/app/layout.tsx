import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "森霖 · 家庭学习",
  description: "森霖家庭学习 - 本地版",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
