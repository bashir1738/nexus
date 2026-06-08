"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ethers } from "ethers";
import { useAccount, useChainId, useConnectorClient } from "wagmi";
import { clientToSigner } from "./ethersAdapter";
import { ABI, CHAIN_ID, CONTRACT_ADDRESS } from "./contractConfig";

// ── Domain types ─────────────────────────────────────────────────────────────

export interface Campaign {
  id: bigint;
  creator: string;
  title: string;
  description: string;
  goal: bigint;
  raisedAmount: bigint;
  deadline: bigint;
  status: number;
  contributorCount: bigint;
}

export interface Milestone {
  title: string;
  amount: bigint;
  completed: boolean;
  approved: boolean;
  votingOpen: boolean;
  approvalVotes: bigint;
  rejectionVotes: bigint;
  votingDeadline: bigint;
}

export interface TxState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

interface Web3ContextValue {
  account: string | undefined;
  chainId: number;
  isCorrectNetwork: boolean;
  tx: TxState;
  campaigns: Campaign[];
  fetchCampaigns: () => Promise<void>;
  fetchCampaign: (id: bigint) => Promise<Campaign | null>;
  fetchMilestones: (id: bigint) => Promise<Milestone[]>;
  fetchContribution: (campaignId: bigint, address: string) => Promise<bigint>;
  fetchHasVoted: (campaignId: bigint, milestoneIndex: bigint, address: string) => Promise<boolean>;
  createCampaign: (title: string, desc: string, goalEth: string, durationDays: number) => Promise<bigint | null>;
  contribute: (campaignId: bigint, ethAmount: string) => Promise<boolean>;
  addMilestone: (campaignId: bigint, title: string, amountEth: string) => Promise<boolean>;
  requestMilestonePayout: (campaignId: bigint, milestoneIndex: bigint) => Promise<boolean>;
  voteOnMilestone: (campaignId: bigint, milestoneIndex: bigint, approve: boolean) => Promise<boolean>;
  claimRefund: (campaignId: bigint) => Promise<boolean>;
  settleCampaign: (campaignId: bigint) => Promise<boolean>;
  clearTx: () => void;
}

const Web3Context = createContext<Web3ContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function Web3Provider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: connectorClient } = useConnectorClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tx, setTx] = useState<TxState>({ loading: false, error: null, success: null });

  const isCorrectNetwork = chainId === CHAIN_ID;

  const clearTx = useCallback(() => {
    setTx({ loading: false, error: null, success: null });
  }, []);

  // ── Derive ethers signer / read-only provider ─────────────────────────────

  const signer = useMemo(
    () => (connectorClient ? clientToSigner(connectorClient) : null),
    [connectorClient]
  );

  // Read-only contract (no signer needed)
  const readContract = useMemo(() => {
    if (!CONTRACT_ADDRESS) return null;
    const rpcUrl = process.env.NEXT_PUBLIC_INFURA_KEY
      ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY}`
      : "https://ethereum-sepolia-rpc.publicnode.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }, []);

  // Write contract (needs signer)
  const writeContract = useMemo(() => {
    if (!CONTRACT_ADDRESS || !signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }, [signer]);

  // ── Error parser ──────────────────────────────────────────────────────────

  const parseError = (e: unknown): string => {
    if (e instanceof Error) {
      const m = e.message;
      const match = m.match(/reverted with reason string '([^']+)'/);
      if (match) return match[1];
      if (m.includes("user rejected") || m.includes("User rejected")) return "Transaction rejected.";
      if (m.includes("insufficient funds")) return "Insufficient ETH.";
      // OpenZeppelin v5 custom errors (decoded by ethers when ABI includes them)
      if (m.includes("EnforcedPause")) return "Contract is paused. Please try again later.";
      if (m.includes("OwnableUnauthorizedAccount")) return "Not authorized (owner only).";
      if (m.includes("ReentrancyGuardReentrantCall")) return "Reentrant call detected.";
      return m.slice(0, 200);
    }
    return "Unknown error.";
  };

  // ── Transaction runner ────────────────────────────────────────────────────

  const runTx = useCallback(
    async <T,>(fn: () => Promise<T>, successMsg: string): Promise<T | null> => {
      if (!writeContract) {
        setTx({ loading: false, error: "Connect your wallet first.", success: null });
        return null;
      }
      setTx({ loading: true, error: null, success: null });
      try {
        const result = await fn();
        setTx({ loading: false, error: null, success: successMsg });
        return result;
      } catch (e) {
        let errorMsg = parseError(e);
        // When the RPC strips revert data, fall back to a read-node simulation to
        // get the actual reason (e.g. EnforcedPause, require messages).
        const isOpaqueRevert =
          errorMsg.includes("missing revert data") ||
          errorMsg.includes("transaction execution reverted");
        if (isOpaqueRevert && readContract) {
          try {
            const isPaused = await readContract.paused();
            if (isPaused) {
              errorMsg = "Contract is paused. Please try again later.";
            } else {
              errorMsg = "Transaction would revert — check you're on Sepolia and have enough ETH for gas.";
            }
          } catch {
            errorMsg = "Transaction failed. Make sure your wallet is connected to Sepolia.";
          }
        }
        setTx({ loading: false, error: errorMsg, success: null });
        return null;
      }
    },
    [writeContract, readContract]
  );

  // ── Read helpers ──────────────────────────────────────────────────────────

  const mapCampaign = (r: Campaign): Campaign => ({
    id: r.id,
    creator: r.creator,
    title: r.title,
    description: r.description,
    goal: r.goal,
    raisedAmount: r.raisedAmount,
    deadline: r.deadline,
    status: Number(r.status),
    contributorCount: r.contributorCount,
  });

  const fetchCampaigns = useCallback(async () => {
    if (!readContract) return;
    try {
      const raw = await readContract.getAllCampaigns();
      setCampaigns(raw.map(mapCampaign));
    } catch {
      // no campaigns yet or contract not deployed
    }
  }, [readContract]);

  const fetchCampaign = useCallback(
    async (id: bigint): Promise<Campaign | null> => {
      if (!readContract) return null;
      try {
        return mapCampaign(await readContract.getCampaign(id));
      } catch {
        return null;
      }
    },
    [readContract]
  );

  const fetchMilestones = useCallback(
    async (id: bigint): Promise<Milestone[]> => {
      if (!readContract) return [];
      try {
        const raw = await readContract.getMilestones(id);
        // Explicitly map named fields — ethers Result named props aren't always
        // enumerable so { ...m } can silently omit them.
        return raw.map((m: any): Milestone => ({
          title: m.title,
          amount: m.amount,
          completed: m.completed,
          approved: m.approved,
          votingOpen: m.votingOpen,
          approvalVotes: m.approvalVotes,
          rejectionVotes: m.rejectionVotes,
          votingDeadline: m.votingDeadline,
        }));
      } catch {
        return [];
      }
    },
    [readContract]
  );

  const fetchContribution = useCallback(
    async (campaignId: bigint, addr: string): Promise<bigint> => {
      if (!readContract) return 0n;
      try {
        return await readContract.contributions(campaignId, addr);
      } catch {
        return 0n;
      }
    },
    [readContract]
  );

  const fetchHasVoted = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint, addr: string): Promise<boolean> => {
      if (!readContract) return false;
      try {
        return await readContract.getMilestoneVoteStatus(campaignId, milestoneIndex, addr);
      } catch {
        return false;
      }
    },
    [readContract]
  );

  // ── Write helpers ─────────────────────────────────────────────────────────

  // Best-effort pre-flight simulation on the public read node.
  // Surfaces real revert reasons when the node supports returning them.
  // If the node returns no revert data ("missing revert data"), we skip
  // and let the actual transaction proceed rather than blocking it.
  const simulate = useCallback(
    async (fnName: string, args: unknown[], overrides?: Record<string, unknown>) => {
      if (!readContract || !address) return;
      try {
        await readContract.getFunction(fnName).staticCall(...args, { from: address, ...overrides });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Node doesn't support revert data on eth_call — skip simulation, let the tx through
        if (msg.includes("missing revert data") || msg.includes("could not coalesce")) return;
        throw e;
      }
    },
    [readContract, address]
  );

  const createCampaign = useCallback(
    async (title: string, desc: string, goalEth: string, durationDays: number): Promise<bigint | null> => {
      return runTx(async () => {
        if (!title.trim()) throw new Error("Title required");
        if (!desc.trim()) throw new Error("Description required");
        const goalWei = ethers.parseEther(goalEth);
        if (goalWei <= 0n) throw new Error("Goal must be greater than 0");
        const duration = Math.max(1, isNaN(durationDays) ? 1 : durationDays);
        const durationSecs = BigInt(duration * 86400);
        await simulate("createCampaign", [title, desc, goalWei, durationSecs]);
        const tx = await writeContract!.createCampaign(title, desc, goalWei, durationSecs, {
          gasLimit: 400_000n,
        });
        const receipt = await tx.wait();
        const iface = new ethers.Interface(ABI);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "CampaignCreated") return parsed.args.campaignId as bigint;
          } catch {}
        }
        // Fallback: return campaignCount - 1 if event not parseable
        const count = await readContract?.campaignCount();
        return count != null ? (BigInt(count) - 1n) : null;
      }, "Campaign created!");
    },
    [writeContract, runTx, simulate, readContract]
  );

  const contribute = useCallback(
    async (campaignId: bigint, ethAmount: string): Promise<boolean> => {
      const r = await runTx(async () => {
        const value = ethers.parseEther(ethAmount);
        await simulate("contribute", [campaignId], { value });
        const tx = await writeContract!.contribute(campaignId, {
          value,
          gasLimit: 1_500_000n,
        });
        await tx.wait();
      }, "Contribution sent! NFT badge minted.");
      return r !== null;
    },
    [writeContract, runTx, simulate]
  );

  const addMilestone = useCallback(
    async (campaignId: bigint, title: string, amountEth: string): Promise<boolean> => {
      const r = await runTx(async () => {
        if (!title.trim()) throw new Error("Milestone title required");
        const amount = ethers.parseEther(amountEth);
        if (amount <= 0n) throw new Error("Milestone amount must be greater than 0");
        await simulate("addMilestone", [campaignId, title, amount]);
        const tx = await writeContract!.addMilestone(campaignId, title, amount, {
          gasLimit: 200_000n,
        });
        await tx.wait();
      }, "Milestone added!");
      return r !== null;
    },
    [writeContract, runTx, simulate]
  );

  const requestMilestonePayout = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint): Promise<boolean> => {
      const r = await runTx(async () => {
        await simulate("requestMilestonePayout", [campaignId, milestoneIndex]);
        const tx = await writeContract!.requestMilestonePayout(campaignId, milestoneIndex, {
          gasLimit: 150_000n,
        });
        await tx.wait();
      }, "Milestone payout requested! Voting is now open for 7 days.");
      return r !== null;
    },
    [writeContract, runTx, simulate]
  );

  const voteOnMilestone = useCallback(
    async (campaignId: bigint, milestoneIndex: bigint, approve: boolean): Promise<boolean> => {
      const r = await runTx(async () => {
        await simulate("voteOnMilestone", [campaignId, milestoneIndex, approve]);
        const tx = await writeContract!.voteOnMilestone(campaignId, milestoneIndex, approve, {
          gasLimit: 200_000n,
        });
        await tx.wait();
      }, approve ? "Vote cast: Approved!" : "Vote cast: Rejected!");
      return r !== null;
    },
    [writeContract, runTx, simulate]
  );

  const claimRefund = useCallback(
    async (campaignId: bigint): Promise<boolean> => {
      const r = await runTx(async () => {
        await simulate("claimRefund", [campaignId]);
        const tx = await writeContract!.claimRefund(campaignId, { gasLimit: 150_000n });
        await tx.wait();
      }, "Refund claimed successfully!");
      return r !== null;
    },
    [writeContract, runTx, simulate]
  );

  const settleCampaign = useCallback(
    async (campaignId: bigint): Promise<boolean> => {
      const r = await runTx(async () => {
        await simulate("settleCampaign", [campaignId]);
        const tx = await writeContract!.settleCampaign(campaignId, { gasLimit: 150_000n });
        await tx.wait();
      }, "Campaign settled!");
      return r !== null;
    },
    [writeContract, runTx, simulate]
  );

  return (
    <Web3Context.Provider
      value={{
        account: address,
        chainId,
        isCorrectNetwork,
        tx,
        campaigns,
        fetchCampaigns,
        fetchCampaign,
        fetchMilestones,
        fetchContribution,
        fetchHasVoted,
        createCampaign,
        contribute,
        addMilestone,
        requestMilestonePayout,
        voteOnMilestone,
        claimRefund,
        settleCampaign,
        clearTx,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used inside Web3Provider");
  return ctx;
}
