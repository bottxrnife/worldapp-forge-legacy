/**
 * ENS reads via viem on mainnet (Universal Resolver). Used to resolve
 * recipients, check subname availability, read app metadata / agent identity
 * (ENSIP-5 text records, ENSIP-26 agent records). Safe no-op on failure.
 */
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com"),
});

export async function resolveAddress(name: string): Promise<string | null> {
  try {
    return await client.getEnsAddress({ name: normalize(name) });
  } catch {
    return null;
  }
}

export async function lookupAddress(address: string): Promise<string | null> {
  try {
    return await client.getEnsName({ address: address as `0x${string}` });
  } catch {
    return null;
  }
}

export async function getTextRecord(name: string, key: string): Promise<string | null> {
  try {
    return await client.getEnsText({ name: normalize(name), key });
  } catch {
    return null;
  }
}
