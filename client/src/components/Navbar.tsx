"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";

export default function Navbar() {
  const { address, isConnected, isConnecting, connect, disconnect, error } =
    useWallet();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 text-sm font-bold text-black">
            C
          </div>
          <span className="text-lg font-bold text-white">
            CoinFlip
          </span>
          <span className="hidden rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400 sm:inline">
            Treasure Hunt
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Play
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 sm:flex">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-400">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="rounded-full border border-zinc-800 px-4 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mx-auto max-w-6xl px-4 pb-2 sm:px-6">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </nav>
  );
}
