"use client";

import { useCallback, useEffect, useState } from "react";
import { rpc } from "@stellar/stellar-sdk";
import { signTransaction, getAddress } from "@stellar/freighter-api";
import { useWallet } from "@/hooks/useWallet";
import {
  getPoolBalance,
  getBetAmount,
  buildFlipTransaction,
  buildFundTransaction,
  getTokenBalance,
} from "@/hooks/contract";
import { getNetwork } from "@/lib/utils";

const TOKEN_SYMBOL = "XLM";
const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2YQQKJH3D5BVIIX7";

type GamePhase = "idle" | "choosing" | "flipping" | "result" | "error";

type FlipResult = {
  won: boolean;
  guess: boolean;
  outcome: boolean;
  txHash?: string;
};

export default function Contract() {
  const { address, isConnected, connect } = useWallet();
  const [poolBalance, setPoolBalance] = useState<bigint>(0n);
  const [betAmount, setBetAmount] = useState<bigint>(100n);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [result, setResult] = useState<FlipResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState<string>("");
  const [showFund, setShowFund] = useState(false);

  // ── Data loading ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [pool, bet] = await Promise.all([
        getPoolBalance(),
        getBetAmount(),
      ]);
      setPoolBalance(pool);
      setBetAmount(bet);

      if (address) {
        const bal = await getTokenBalance(TOKEN_ADDRESS, address);
        setUserBalance(bal);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
    }
  }, [address]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10_000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Game Actions ────────────────────────────────────────────────

  const broadcastTx = async (signedXdr: string): Promise<string> => {
    const server = new rpc.Server(
      "https://soroban-testnet.stellar.org",
    );
    const tx = rpc.TransactionBuilder.fromXDR(signedXdr, {
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const sendResult = await server.sendTransaction(tx);
    if (sendResult.status === "PENDING") {
      // Wait for confirmation
      let status = sendResult;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        status = await server.getTransaction(status.hash);
        if (status.status !== "NOT_FOUND") break;
      }
      return status.hash;
    }
    throw new Error(`Transaction failed: ${sendResult.errorResult?.result?.code}`);
  };

  const handleFlip = async (guess: boolean) => {
    if (!isConnected || !address) {
      await connect();
      return;
    }

    setPhase("flipping");
    setError(null);
    setResult(null);

    try {
      const txXdr = await buildFlipTransaction(
        address,
        guess,
        TOKEN_ADDRESS,
        betAmount,
      );

      const { signedTxXdr } = await signTransaction(txXdr, {
        networkPassphrase: getNetwork().networkPassphrase,
      });

      const txHash = await broadcastTx(signedTxXdr);

      // Reload data after transaction
      await new Promise((r) => setTimeout(r, 2000));
      await loadData();

      setPhase("result");
      // We won't know the actual outcome without parsing events,
      // so we show a generic success
      setResult({
        won: false, // We'll detect this from balance change
        guess,
        outcome: false,
        txHash,
      });

      // Check if balance increased (won) or decreased (lost)
      const newBal = await getTokenBalance(TOKEN_ADDRESS, address);
      if (newBal > userBalance) {
        setResult({ won: true, guess, outcome: true, txHash });
      } else {
        setResult({ won: false, guess, outcome: false, txHash });
      }
    } catch (err: any) {
      setPhase("error");
      setError(err.message || "Transaction failed");
    }
  };

  const handleFund = async () => {
    if (!isConnected || !address || !fundAmount) return;

    setPhase("flipping");
    setError(null);

    try {
      const amount = BigInt(Math.round(parseFloat(fundAmount) * 10_000_000));
      const txXdr = await buildFundTransaction(address, amount, TOKEN_ADDRESS);

      const { signedTxXdr } = await signTransaction(txXdr, {
        networkPassphrase: getNetwork().networkPassphrase,
      });

      await broadcastTx(signedTxXdr);
      await loadData();
      setShowFund(false);
      setFundAmount("");
      setPhase("idle");
    } catch (err: any) {
      setPhase("error");
      setError(err.message || "Fund transaction failed");
    }
  };

  const resetGame = () => {
    setPhase("idle");
    setResult(null);
    setError(null);
  };

  // ── Formatting ──────────────────────────────────────────────────

  const formatBalance = (bal: bigint) => {
    const num = Number(bal) / 10_000_000;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    });
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
      {/* Stats Cards */}
      <div className="flex w-full gap-3">
        <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Prize Pool
          </p>
          <p className="mt-1 text-lg font-bold text-yellow-400">
            {formatBalance(poolBalance)} {TOKEN_SYMBOL}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Your Balance
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatBalance(userBalance)} {TOKEN_SYMBOL}
          </p>
        </div>
      </div>

      {/* Bet Info */}
      <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-5 py-2 text-center">
        <span className="text-sm text-zinc-400">
          Bet:{" "}
          <span className="font-semibold text-white">
            {formatBalance(betAmount)} {TOKEN_SYMBOL}
          </span>
          {" · "}Win:{" "}
          <span className="font-semibold text-yellow-400">
            2x
          </span>
        </span>
      </div>

      {/* Main Game Area */}
      <div className="relative flex w-full flex-col items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
        {/* Coin */}
        <div className="relative">
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-4xl font-black text-black shadow-lg shadow-yellow-500/20 transition-all duration-500 ${
              phase === "flipping" ? "animate-spin-slow" : ""
            }`}
          >
            {phase === "result" && result
              ? result.won
                ? "🏆"
                : "💀"
              : "?"}
          </div>
          {phase === "flipping" && (
            <div className="absolute -inset-4 animate-pulse rounded-full bg-yellow-500/10" />
          )}
        </div>

        {/* Phase: Choose */}
        {(phase === "idle" || phase === "choosing") && (
          <>
            <p className="text-center text-lg font-semibold text-white">
              {isConnected
                ? "Heads or Tails?"
                : "Connect your wallet to play"}
            </p>
            <p className="text-center text-sm text-zinc-400">
              Guess correctly to win double your bet from the treasure pool!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleFlip(true)}
                disabled={!isConnected}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-3 text-lg font-bold text-white transition-all hover:border-yellow-500/50 hover:bg-zinc-700 disabled:opacity-40"
              >
                🪙 Heads
              </button>
              <button
                onClick={() => handleFlip(false)}
                disabled={!isConnected}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-3 text-lg font-bold text-white transition-all hover:border-yellow-500/50 hover:bg-zinc-700 disabled:opacity-40"
              >
                🪙 Tails
              </button>
            </div>
          </>
        )}

        {/* Phase: Flipping */}
        {phase === "flipping" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-yellow-400">
              Flipping...
            </p>
            <p className="text-sm text-zinc-400">
              Please confirm the transaction in Freighter
            </p>
          </div>
        )}

        {/* Phase: Result */}
        {phase === "result" && result && (
          <div className="flex flex-col items-center gap-4">
            <p
              className={`text-2xl font-bold ${
                result.won ? "text-yellow-400" : "text-red-400"
              }`}
            >
              {result.won ? "🎉 You Won!" : "😢 You Lost!"}
            </p>
            <p className="text-sm text-zinc-400">
              You guessed <strong>{result.guess ? "Heads" : "Tails"}</strong>
              {" · "}
              Coin was <strong>{result.outcome ? "Heads" : "Tails"}</strong>
            </p>
            {result.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 underline underline-offset-2 hover:text-blue-300"
              >
                View on Stellar Expert →
              </a>
            )}
            <button
              onClick={resetGame}
              className="mt-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Phase: Error */}
        {phase === "error" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-red-400">
              Transaction Failed
            </p>
            <p className="max-w-xs text-center text-sm text-zinc-400">
              {error}
            </p>
            <button
              onClick={resetGame}
              className="mt-2 rounded-full border border-zinc-700 px-6 py-2 text-sm text-white"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Fund Pool */}
      <div className="w-full">
        {showFund ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="mb-3 text-sm font-medium text-white">
              Donate to Treasure Pool
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount in XLM"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-yellow-500"
              />
              <button
                onClick={handleFund}
                disabled={!fundAmount || !isConnected}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Donate
              </button>
              <button
                onClick={() => setShowFund(false)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowFund(true)}
            className="w-full rounded-xl border border-dashed border-zinc-800 py-3 text-sm text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white"
          >
            + Fund the Treasure Pool
          </button>
        )}
      </div>
    </div>
  );
}
