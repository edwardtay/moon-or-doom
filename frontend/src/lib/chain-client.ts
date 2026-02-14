import { createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { crashGameAbi } from "./crash-game-abi";

const opBNBTestnet = defineChain({
  id: 5611,
  name: "opBNB Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: { default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] } },
  blockExplorers: { default: { name: "opBNBScan", url: "https://opbnb-testnet.bscscan.com" } },
  testnet: true,
});

/**
 * Dual-chain client for operator wallet.
 * Sends commit-reveal proofs to BOTH opBNB Testnet and BSC Testnet.
 * All calls are fire-and-forget — the off-chain game engine is the source of truth.
 */

const OPBNB_CONTRACT = process.env
  .NEXT_PUBLIC_CRASH_GAME_ADDRESS as `0x${string}` | undefined;

const BSC_CONTRACT = process.env
  .NEXT_PUBLIC_CRASH_GAME_ADDRESS_BSC as `0x${string}` | undefined;

const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

// Per-chain state
interface ChainState {
  walletClient: ReturnType<typeof createWalletClient> | null;
  contractAddress: `0x${string}`;
  consecutiveFailures: number;
  circuitOpen: boolean;
  label: string;
}

const MAX_FAILURES = 3;

const chains: ChainState[] = [];

function initChains() {
  if (chains.length > 0 || !OPERATOR_KEY) return;

  const account = privateKeyToAccount(OPERATOR_KEY);

  if (OPBNB_CONTRACT) {
    chains.push({
      walletClient: createWalletClient({
        account,
        chain: opBNBTestnet,
        transport: http("https://opbnb-testnet-rpc.bnbchain.org"),
      }),
      contractAddress: OPBNB_CONTRACT,
      consecutiveFailures: 0,
      circuitOpen: false,
      label: "opBNB",
    });
  }

  if (BSC_CONTRACT) {
    chains.push({
      walletClient: createWalletClient({
        account,
        chain: bscTestnet,
        transport: http("https://data-seed-prebsc-1-s1.bnbchain.org:8545"),
      }),
      contractAddress: BSC_CONTRACT,
      consecutiveFailures: 0,
      circuitOpen: false,
      label: "BSC",
    });
  }
}

async function sendToChain(
  chain: ChainState,
  functionName: string,
  args: unknown[]
): Promise<string | null> {
  if (chain.circuitOpen) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await (chain.walletClient as any).writeContract({
      address: chain.contractAddress,
      abi: crashGameAbi,
      functionName,
      args,
    });

    chain.consecutiveFailures = 0;
    console.log(`[chain:${chain.label}] ${functionName} tx: ${hash}`);
    return hash;
  } catch {
    chain.consecutiveFailures++;
    if (chain.consecutiveFailures >= MAX_FAILURES && !chain.circuitOpen) {
      chain.circuitOpen = true;
      console.log(`[chain:${chain.label}] Circuit breaker OPEN after ${MAX_FAILURES} failures.`);
    }
    return null;
  }
}

async function sendAll(functionName: string, args: unknown[] = []) {
  initChains();
  if (chains.length === 0) return;

  // Fire to all chains in parallel — don't wait for each other
  await Promise.allSettled(
    chains.map((c) => sendToChain(c, functionName, args))
  );
}

export async function onChainStartRound(commitHash: string) {
  return sendAll("startRound", [commitHash as `0x${string}`]);
}

export async function onChainLockRound() {
  return sendAll("lockRound");
}

export async function onChainRecordCashOut(
  player: string,
  multiplier: number
) {
  return sendAll("recordCashOut", [
    player as `0x${string}`,
    BigInt(multiplier),
  ]);
}

export async function onChainEndRound(
  crashMultiplier: number,
  salt: string
) {
  return sendAll("endRound", [
    BigInt(crashMultiplier),
    salt as `0x${string}`,
  ]);
}

export function isChainEnabled(): boolean {
  return !!OPERATOR_KEY && (!!OPBNB_CONTRACT || !!BSC_CONTRACT);
}
