"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import {
  getPoolBalance,
  getBetAmount,
  getTokenBalance,
} from "@/hooks/contract";

const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2YQQKJH3D5BVIIX7";
const TOKEN_SYMBOL = "XLM";

type DashboardData = {
  poolBalance: bigint;
  betAmount: bigint;
  userBalance: bigint | null;
};

export default function Dashboard() {
  const { address, isConnected, connect } = useWallet();
  const [data, setData] = useState<DashboardData>({
    poolBalance: 0n,
    betAmount: 0n,
    userBalance: null,
  });
  const [recentFlips, setRecentFlips] = useState<
    Array<{ hash: string; won: boolean; timestamp: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pool, bet] = await Promise.all([
        getPoolBalance(),
        getBetAmount(),
      ]);
      let userBal: bigint | null = null;
      if (address) {
        userBal = await getTokenBalance(TOKEN_ADDRESS, address);
      }
      setData({ poolBalance: pool, betAmount: bet, userBalance: userBal });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatBalance = (bal: bigint) => {
    const num = Number(bal) / 10_000_000;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Overview of your CoinFlip activity and the treasure pool.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Prize Pool
          </p>
          <p className="mt-2 text-2xl font-bold text-yellow-400">
            {formatBalance(data.poolBalance)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{TOKEN_SYMBOL}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Bet Amount
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatBalance(data.betAmount)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{TOKEN_SYMBOL}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Your Wallet
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.userBalance !== null
              ? formatBalance(data.userBalance)
              : "—"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">
            {data.userBalance !== null
              ? `${TOKEN_SYMBOL} balance`
              : "Connect wallet"}
          </p>
        </div>
      </div>

      {/* Game Info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">
          How It Works
        </h2>
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-bold text-yellow-400">
              1
            </span>
            <p>
              Connect your Freighter wallet and make sure you have some{" "}
              {TOKEN_SYMBOL} on Stellar Testnet.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-bold text-yellow-400">
              2
            </span>
            <p>
              Guess Heads or Tails. The Soroban smart contract uses
              verifiable on-chain randomness.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-bold text-yellow-400">
              3
            </span>
            <p>
              Win double your bet from the treasure pool.{" "}
              <span className="text-yellow-400">
                {formatBalance(data.betAmount)} {TOKEN_SYMBOL}
              </span>{" "}
              →{" "}
              <span className="text-yellow-400">
                {formatBalance(data.betAmount * 2n)} {TOKEN_SYMBOL}
              </span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-bold text-yellow-400">
              4
            </span>
            <p>
              Lose? Your bet goes into the treasure pool, making it
              bigger for the next winner!
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Recent Activity
        </h2>
        {recentFlips.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            No flips yet. Start playing on the{" "}
            <a href="/" className="text-yellow-400 underline underline-offset-2">
              game page
            </a>
            !
          </p>
        ) : (
          <div className="space-y-2">
            {recentFlips.map((flip, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-900/50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg ${flip.won ? "" : "opacity-50"}`}
                  >
                    {flip.won ? "🪙" : "💀"}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      flip.won ? "text-yellow-400" : "text-zinc-400"
                    }`}
                  >
                    {flip.won ? "Won" : "Lost"}
                  </span>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${flip.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 underline underline-offset-2"
                >
                  View Tx
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contract Info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">
          Contract Details
        </h2>
        <div className="space-y-1 text-xs text-zinc-600">
          <p>
            Network: <span className="text-zinc-400">Stellar Testnet</span>
          </p>
          <p>
            RPC:{" "}
            <span className="text-zinc-400">
              soroban-testnet.stellar.org
            </span>
          </p>
          <p>
            Token:{" "}
            <span className="font-mono text-zinc-400">
              {TOKEN_ADDRESS.slice(0, 8)}...{TOKEN_ADDRESS.slice(-6)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
