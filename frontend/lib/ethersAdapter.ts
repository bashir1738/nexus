/**
 * Bridges wagmi's connector client to ethers.js v6 primitives.
 * Required because the assignment mandates ethers.js for contract calls.
 */
import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Account, Chain, Client, Transport } from "viem";

export function clientToProvider(client: Client<Transport, Chain>): BrowserProvider {
  const { chain, transport } = client;
  const network = { chainId: chain.id, name: chain.name };
  // viem transport is EIP-1193 compatible; cast to satisfy ethers BrowserProvider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrowserProvider(transport as any, network);
}

export function clientToSigner(client: Client<Transport, Chain, Account>): JsonRpcSigner {
  const { account, chain, transport } = client;
  const network = { chainId: chain.id, name: chain.name };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = new BrowserProvider(transport as any, network);
  return new JsonRpcSigner(provider, account.address);
}
