"use client";

import { useCallback, useEffect, useState } from "react";
import { isConnected, getAddress, signTransaction } from "@stellar/freighter-api";
import { getNetwork } from "@/lib/utils";

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    try {
      const resp = await isConnected();
      if (resp.isConnected) {
        const { address } = await getAddress();
        setState((prev) => ({
          ...prev,
          address,
          isConnected: true,
          error: null,
        }));
        return address;
      } else {
        setState((prev) => ({
          ...prev,
          address: null,
          isConnected: false,
        }));
        return null;
      }
    } catch (err: any) {
      console.error("Freighter check failed:", err);
      setState((prev) => ({
        ...prev,
        address: null,
        isConnected: false,
        error: "Freighter not detected. Please install the Freighter wallet extension.",
      }));
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const resp = await isConnected();
      if (!resp.isConnected) {
        throw new Error("Freighter is not connected. Please unlock your wallet.");
      }
      const { address } = await getAddress();
      setState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      return address;
    } catch (err: any) {
      const msg =
        err?.message || "Failed to connect to Freighter. Please install or unlock it.";
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: msg,
      }));
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const signAndSend = useCallback(
    async (txXdr: string): Promise<{ hash: string; signedXdr: string }> => {
      const network = getNetwork();
      const { signedTxXdr } = await signTransaction(txXdr, {
        networkPassphrase: network.networkPassphrase,
      });
      return { hash: "", signedXdr: signedTxXdr };
    },
    [],
  );

  return {
    ...state,
    connect,
    disconnect,
    checkConnection,
    signAndSend,
  };
}
