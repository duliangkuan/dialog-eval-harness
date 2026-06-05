import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "美团外呼 Agent 评测作战台",
  description: "复杂指令多轮对话评测系统：User Simulator、Eval Agent、Harness Loop 与归因报告。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
