import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoinFlip Treasure Hunt - Guess & Win on Stellar",
  description:
    "A fair on-chain coin flip game on Stellar Soroban. Connect Freighter, guess heads or tails, and win digital gold.",
  openGraph: {
    title: "CoinFlip Treasure Hunt",
    description:
      "Guess the coin flip on Stellar blockchain and win digital gold.",
  },
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
      <body className="flex min-h-full flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
