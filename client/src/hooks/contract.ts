"use client";

import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import { getRpcServer, getNetwork } from "@/lib/utils";

// ── Configuration ──────────────────────────────────────────────────

// Fill these after deployment:
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

// ── Token Interface ────────────────────────────────────────────────

const XLM_CONTRACT_ADDRESS =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2YQQKJH3D5BVIIX7";

export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string,
): Promise<bigint> {
  const server = getRpcServer();
  const contract = new Contract(tokenAddress);

  const sim = await server.simulateTransaction(
    new TransactionBuilder(
      await server.getAccount(
        "GAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
      { fee: "100", networkPassphrase: NETWORK_PASSPHRASE },
    )
      .addOperation(
        contract.call("balance", new Address(userAddress).toScVal()),
      )
      .setTimeout(30)
      .build(),
  );

  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  return scValToNative(sim.result!.retval) as bigint;
}

// ── CoinFlip Contract ──────────────────────────────────────────────

function getContract() {
  if (!CONTRACT_ADDRESS) {
    // Return null instead of throwing so the UI can show a friendly message
    return null;
  }
  return new Contract(CONTRACT_ADDRESS);
}

/**
 * Read-only: Get the current prize pool balance of the contract.
 */
export async function getPoolBalance(): Promise<bigint> {
  const contract = getContract();
  if (!contract) return 0n;

  const server = getRpcServer();

  const sim = await server.simulateTransaction(
    new TransactionBuilder(
      await server.getAccount(
        "GAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
      { fee: "100", networkPassphrase: NETWORK_PASSPHRASE },
    )
      .addOperation(contract.call("get_pool"))
      .setTimeout(30)
      .build(),
  );

  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  return scValToNative(sim.result!.retval) as bigint;
}

/**
 * Read-only: Get the current bet amount.
 */
export async function getBetAmount(): Promise<bigint> {
  const contract = getContract();
  if (!contract) return 0n;

  const server = getRpcServer();

  const sim = await server.simulateTransaction(
    new TransactionBuilder(
      await server.getAccount(
        "GAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
      { fee: "100", networkPassphrase: NETWORK_PASSPHRASE },
    )
      .addOperation(contract.call("get_bet"))
      .setTimeout(30)
      .build(),
  );

  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  return scValToNative(sim.result!.retval) as bigint;
}

/**
 * Build and sign a `flip` transaction.
 * Returns the signed XDR that the user can broadcast.
 */
export async function buildFlipTransaction(
  source: string,
  guess: boolean,
  tokenAddress: string,
  betAmount: bigint,
): Promise<string> {
  const contract = getContract();
  if (!contract) throw new Error("Contract not deployed yet");

  const server = getRpcServer();
  const account = await server.getAccount(source);

  // Build a transaction that:
  // 1. Approves the contract to spend betAmount tokens from user
  // 2. Calls flip(guess)
  const tx = new TransactionBuilder(account, {
    fee: "1000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      new Contract(tokenAddress).call(
        "approve",
        new Address(source).toScVal(),
        new Address(CONTRACT_ADDRESS!).toScVal(),
        nativeToScVal(betAmount, { type: "i128" }),
        nativeToScVal(0, { type: "i128" }), // expiration ledger (0 = no expiration)
      ),
    )
    .addOperation(
      contract.call("flip", new Address(source).toScVal(), nativeToScVal(guess, { type: "bool" })),
    )
    .setTimeout(30)
    .build();

  // Simulate first
  const sim = await server.simulateTransaction(tx);

  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  // Assemble the transaction with the simulation result
  const preparedTx = rpc.assembleTransaction(tx, sim);

  return preparedTx.toXDR();
}

/**
 * Build a `fund` transaction so the user can donate tokens to the prize pool.
 */
export async function buildFundTransaction(
  source: string,
  amount: bigint,
  tokenAddress: string,
): Promise<string> {
  const contract = getContract();
  if (!contract) throw new Error("Contract not deployed yet");

  const server = getRpcServer();
  const account = await server.getAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: "1000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      new Contract(tokenAddress).call(
        "approve",
        new Address(source).toScVal(),
        new Address(CONTRACT_ADDRESS!).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
        nativeToScVal(0, { type: "i128" }),
      ),
    )
    .addOperation(
      contract.call(
        "fund",
        new Address(source).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, sim);
  return preparedTx.toXDR();
}

/**
 * Build a read-only `initialize` simulation (for deploy scripts).
 */
export async function simulateInitialize(
  tokenAddress: string,
  betAmount: bigint,
): Promise<any> {
  const contract = getContract();
  if (!contract) throw new Error("Contract not deployed yet");

  const server = getRpcServer();
  const source =
    "GAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  const sim = await server.simulateTransaction(
    new TransactionBuilder(await server.getAccount(source), {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "initialize",
          new Address(tokenAddress).toScVal(),
          nativeToScVal(betAmount, { type: "i128" }),
        ),
      )
      .setTimeout(30)
      .build(),
  );

  return sim;
}
