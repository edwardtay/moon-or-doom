import { createWalletClient, http, defineChain, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { crashGameAbi } from "./crash-game-abi";

/**
 * Agent's own on-chain client.
 * Uses AGENT_PRIVATE_KEY to sign transactions (placeBet, claimWinnings).
 * Separate from the operator's chain-client which handles round lifecycle.
 */

const opBNBTestnet = defineChain({
  id: 5611,
  name: "opBNB Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: { default: { http: ["https://opbnb-testnet-rpc.bnbchain.org"] } },
  blockExplorers: { default: { name: "opBNBScan", url: "https://opbnb-testnet.bscscan.com" } },
  testnet: true,
});

const AGENT_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
const OPBNB_CONTRACT = process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS as `0x${string}` | undefined;
const BSC_CONTRACT = process.env.NEXT_PUBLIC_CRASH_GAME_ADDRESS_BSC as `0x${string}` | undefined;

interface ChainTarget {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  contract: `0x${string}`;
  label: string;
  failures: number;
  disabled: boolean;
}

let agentAddress: string | null = null;
const targets: ChainTarget[] = [];

function init() {
  if (targets.length > 0 || !AGENT_KEY) return;

  const account = privateKeyToAccount(AGENT_KEY);
  agentAddress = account.address;
  console.log(`[agent-chain] Agent wallet: ${agentAddress}`);

  if (OPBNB_CONTRACT) {
    targets.push({
      client: createWalletClient({
        account,
        chain: opBNBTestnet,
        transport: http("https://opbnb-testnet-rpc.bnbchain.org"),
      }),
      contract: OPBNB_CONTRACT,
      label: "opBNB",
      failures: 0,
      disabled: false,
    });
  }

  if (BSC_CONTRACT) {
    targets.push({
      client: createWalletClient({
        account,
        chain: bscTestnet,
        transport: http("https://data-seed-prebsc-1-s1.bnbchain.org:8545"),
      }),
      contract: BSC_CONTRACT,
      label: "BSC",
      failures: 0,
      disabled: false,
    });
  }
}

export function getAgentWalletAddress(): string | null {
  if (!AGENT_KEY) return null;
  if (!agentAddress) {
    agentAddress = privateKeyToAccount(AGENT_KEY).address;
  }
  return agentAddress;
}

/**
 * Agent places a bet on-chain. Sends real tBNB.
 * Fire-and-forget to both chains in parallel.
 */
export async function agentOnChainBet(amountBNB: number): Promise<void> {
  init();
  if (targets.length === 0) return;

  const value = parseEther(amountBNB.toFixed(18));

  await Promise.allSettled(
    targets
      .filter((t) => !t.disabled)
      .map(async (t) => {
        try {
          const hash = await t.client.writeContract({
            address: t.contract,
            abi: crashGameAbi,
            functionName: "placeBet",
            args: [],
            value,
          });
          t.failures = 0;
          console.log(`[agent-chain:${t.label}] placeBet tx: ${hash}`);
        } catch (err: unknown) {
          t.failures++;
          const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown";
          console.log(`[agent-chain:${t.label}] placeBet failed (${t.failures}): ${msg}`);
          if (t.failures >= 3) {
            t.disabled = true;
            console.log(`[agent-chain:${t.label}] Disabled after 3 failures`);
          }
        }
      })
  );
}

/**
 * Agent claims winnings after a resolved round.
 * Fire-and-forget to both chains in parallel.
 */
export async function agentClaimWinnings(roundId: number): Promise<void> {
  init();
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets
      .filter((t) => !t.disabled)
      .map(async (t) => {
        try {
          const hash = await t.client.writeContract({
            address: t.contract,
            abi: crashGameAbi,
            functionName: "claimWinnings",
            args: [BigInt(roundId)],
          });
          t.failures = 0;
          console.log(`[agent-chain:${t.label}] claimWinnings tx: ${hash}`);
        } catch (err: unknown) {
          t.failures++;
          const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown";
          console.log(`[agent-chain:${t.label}] claimWinnings failed: ${msg}`);
        }
      })
  );
}

export function isAgentChainEnabled(): boolean {
  return !!AGENT_KEY && (!!OPBNB_CONTRACT || !!BSC_CONTRACT);
}
