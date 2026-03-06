import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "あいおい塾 会員サイト",
  description: "あいおい塾の生徒・保護者・管理者向け会員サイト",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
