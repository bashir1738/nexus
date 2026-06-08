import { ethers } from "ethers";

export function formatEth(wei: bigint, decimals = 4): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDeadline(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeRemaining(deadline: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(deadline) - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diff % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export function progressPercent(raised: bigint, goal: bigint): number {
  if (goal === 0n) return 0;
  return Math.min(100, Number((raised * 100n) / goal));
}

export const STATUS_LABELS: Record<number, string> = {
  0: "Active",
  1: "Successful",
  2: "Failed",
  3: "Completed",
};

export const STATUS_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-red-100 text-red-700",
  3: "bg-purple-100 text-purple-700",
};

export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    // Extract revert reason
    const match = msg.match(/reverted with reason string '([^']+)'/);
    if (match) return match[1];
    const match2 = msg.match(/execution reverted: ([^"]+)/);
    if (match2) return match2[1];
    if (msg.includes("user rejected")) return "Transaction rejected by user.";
    if (msg.includes("insufficient funds")) return "Insufficient ETH balance.";
    return msg.slice(0, 120);
  }
  return "Unknown error occurred.";
}
