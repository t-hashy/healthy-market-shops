import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ヘルシーマーケット出店者紹介",
  description: "オーガニックマルシェ「ヘルシーマーケット」の素敵な出店者さんをご紹介します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJp.className} bg-stone-50 text-stone-900 antialiased`}
      >
        <main>{children}</main>
      </body>
    </html>
  );
}
