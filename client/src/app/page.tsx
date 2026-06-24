import Navbar from "@/components/Navbar";
import Contract from "@/components/Contract";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center px-4 py-12 sm:px-6">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
            CoinFlip Treasure Hunt
          </h1>
          <p className="mt-3 text-base text-zinc-400">
            Guess the coin flip, win digital gold. Fair randomness. Instant payouts.
          </p>
        </div>

        {/* Game */}
        <Contract />

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-zinc-600">
          <p>
            Powered by{" "}
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline underline-offset-2 hover:text-white"
            >
              Stellar
            </a>{" "}
            · Soroban Smart Contracts · Freighter Wallet
          </p>
        </footer>
      </main>
    </>
  );
}
