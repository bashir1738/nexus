"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWeb3 } from "@/lib/web3Context";
import CampaignCard from "@/components/CampaignCard";
import { CONTRACT_ADDRESS } from "@/lib/contractConfig";

export default function HomePage() {
  const { campaigns, fetchCampaigns } = useWeb3();
  const { isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "successful" | "failed" | "completed">(
    "all"
  );

  useEffect(() => {
    fetchCampaigns().finally(() => setLoading(false));
  }, [fetchCampaigns]);

  const filtered = campaigns.filter((c) => {
    if (filter === "all") return true;
    const map = { active: 0, successful: 1, failed: 2, completed: 3 };
    return c.status === map[filter];
  });

  const noContract = !CONTRACT_ADDRESS;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="rounded-2xl bg-indigo-600 p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Decentralized Crowdfunding</h1>
        <p className="text-indigo-100 max-w-xl mb-6">
          Fund projects transparently. Funds are locked in escrow and released only when milestones
          are approved by backers — no trust required.
        </p>
        <div className="flex gap-3 flex-wrap items-center">
          <Link
            href="/campaigns/create"
            className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors"
          >
            Launch a Campaign
          </Link>
          {!isConnected && (
            <div className="[&_button]:!rounded-xl [&_button]:!font-medium [&_button]:!border [&_button]:!border-white/40">
              <ConnectButton label="Connect Wallet" accountStatus="address" showBalance={false} />
            </div>
          )}
        </div>
      </div>

      {noContract && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
          <strong>Contract not deployed yet.</strong> Run{" "}
          <code className="bg-amber-100 px-1 rounded">npm run deploy:sepolia</code> from the{" "}
          <code className="bg-amber-100 px-1 rounded">contract/</code> directory.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length },
          { label: "Active", value: campaigns.filter((c) => c.status === 0).length },
          { label: "Successful", value: campaigns.filter((c) => c.status === 1).length },
          { label: "Completed", value: campaigns.filter((c) => c.status === 3).length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "active", "successful", "failed", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaign grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">
            {campaigns.length === 0 ? "No campaigns yet." : "No campaigns match this filter."}
          </p>
          <Link
            href="/campaigns/create"
            className="inline-flex px-5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Create the first campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <CampaignCard key={c.id.toString()} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
