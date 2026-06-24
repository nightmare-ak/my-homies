import {
  Address,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export function getRpcServer() {
  return new rpc.Server(RPC_URL);
}

export function getNetwork() {
  return {
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
  };
}

// ── ScVal converters ──────────────────────────────────────────────

export function toScValString(v: string): xdr.ScVal {
  return nativeToScVal(v, { type: "string" });
}

export function toScValU32(v: number): xdr.ScVal {
  return nativeToScVal(v, { type: "u32" });
}

export function toScValI128(v: number | bigint): xdr.ScVal {
  return nativeToScVal(v, { type: "i128" });
}

export function toScValAddress(v: string): xdr.ScVal {
  return new Address(v).toScVal();
}

export function toScValBool(v: boolean): xdr.ScVal {
  return nativeToScVal(v, { type: "bool" });
}

export function toScValSymbol(v: string): xdr.ScVal {
  return nativeToScVal(v, { type: "symbol" });
}

export function toScValU64(v: number | bigint): xdr.ScVal {
  return nativeToScVal(v, { type: "u64" });
}

export function toScValI64(v: number | bigint): xdr.ScVal {
  return nativeToScVal(v, { type: "i64" });
}

// ── Parse helpers ─────────────────────────────────────────────────

export function scvalToString(sv: xdr.ScVal): string {
  return scValToNative(sv) as string;
}

export function scvalToI128(sv: xdr.ScVal): bigint {
  return scValToNative(sv) as bigint;
}

export function scvalToBool(sv: xdr.ScVal): boolean {
  return scValToNative(sv) as boolean;
}

// ── Smart Contract helpers ────────────────────────────────────────

export async function readContract(
  method: string,
  args: xdr.ScVal[],
  source?: string,
): Promise<any> {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ADDRESS);

  const sim = await server.simulateTransaction(
    new rpc.TransactionBuilder(
      await server.getAccount(source || PUBLIC_KEY_PLACEHOLDER),
      { fee: "100", networkPassphrase: NETWORK_PASSPHRASE },
    )
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build(),
  );

  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  if (!sim.result) {
    throw new Error("No result from simulation");
  }

  return scValToNative(sim.result.retval);
}

export async function callContract(
  method: string,
  args: xdr.ScVal[],
  source: string,
  submit: boolean = true,
): Promise<rpc.SorobanRpc.SendTransactionResponse | any> {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ADDRESS);

  if (!source) {
    throw new Error("Wallet not connected");
  }

  const account = await server.getAccount(source);
  const tx = new rpc.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  if (!submit) {
    return tx;
  }

  // Simulate first
  const sim = await server.simulateTransaction(tx);
  if (rpc.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  return sim;
}

// ── Constants ──────────────────────────────────────────────────────

// Placeholder — will be replaced with actual contract address after deploy
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

// Testnet token addresses
export const XLM_CONTRACT =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2YQQKJH3D5BVIIX7";
export const USDC_CONTRACT =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

// Dummy source for read-only simulations
export const PUBLIC_KEY_PLACEHOLDER =
  "GAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
