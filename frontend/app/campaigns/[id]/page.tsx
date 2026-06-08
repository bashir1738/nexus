"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWeb3 } from "@/lib/web3Context";
import type { Campaign, Milestone } from "@/lib/web3Context";
import ProgressBar from "@/components/ProgressBar";
import {
  formatEth,
  formatDeadline,
  progressPercent,
  shortenAddress,
  STATUS_LABELS,
  STATUS_COLORS,
  timeRemaining,
} from "@/lib/utils";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const {
    fetchCampaign,
    fetchMilestones,
    fetchContribution,
    fetchHasVoted,
    contribute,
    addMilestone,
    requestMilestonePayout,
    voteOnMilestone,
    claimRefund,
    settleCampaign,
    tx,
  } = useWeb3();

  const campaignId = BigInt(id ?? "0");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [myContribution, setMyContribution] = useState(0n);
  const [myVotes, setMyVotes] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributeAmount, setContributeAmount] = useState("");
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsAmount, setNewMsAmount] = useState("");
  const [showAddMs, setShowAddMs] = useState(false);

  const load = useCallback(async () => {
    const [camp, ms] = await Promise.all([
      fetchCampaign(campaignId),
      fetchMilestones(campaignId),
    ]);
    if (!camp) { router.push("/"); return; }
    setCampaign(camp);
    setMilestones(ms);

    if (address) {
      const [contrib, votes] = await Promise.all([
        fetchContribution(campaignId, address),
        Promise.all(ms.map((_, i) => fetchHasVoted(campaignId, BigInt(i), address))),
      ]);
      setMyContribution(contrib);
      setMyVotes(votes);
    }
    setLoading(false);
  }, [campaignId, address, fetchCampaign, fetchMilestones, fetchContribution, fetchHasVoted, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tx.success) load(); }, [tx.success, load]);

  const isCreator = address?.toLowerCase() === campaign?.creator.toLowerCase();
  const isBacker = myContribution > 0n;
  const pct = campaign ? progressPercent(campaign.raisedAmount, campaign.goal) : 0;
  const isDeadlinePassed = campaign ? Date.now() / 1000 > Number(campaign.deadline) : false;

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await contribute(campaignId, contributeAmount);
    if (ok) setContributeAmount("");
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addMilestone(campaignId, newMsTitle, newMsAmount);
    if (ok) { setNewMsTitle(""); setNewMsAmount(""); setShowAddMs(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }
  if (!campaign) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
          <p className="text-sm text-gray-400 mt-1">
            by {shortenAddress(campaign.creator)}
            {isCreator && <span className="ml-2 text-indigo-500 font-medium">(you)</span>}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[campaign.status]}`}>
          {STATUS_LABELS[campaign.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Description */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-3">About this project</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
              {campaign.description}
            </p>
          </div>

          {/* Milestones */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Milestones</h2>
              {isCreator && campaign.status === 0 && (
                <button
                  onClick={() => setShowAddMs(!showAddMs)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {showAddMs ? "Cancel" : "+ Add milestone"}
                </button>
              )}
            </div>

            {showAddMs && (
              <form
                onSubmit={handleAddMilestone}
                className="flex flex-col gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100"
              >
                <div className="flex gap-2">
                  <input
                    required
                    value={newMsTitle}
                    onChange={(e) => setNewMsTitle(e.target.value)}
                    placeholder="Milestone title"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    required
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={newMsAmount}
                    onChange={(e) => setNewMsAmount(e.target.value)}
                    placeholder="ETH"
                    className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={tx.loading}
                  className="py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  Add Milestone
                </button>
              </form>
            )}

            {milestones.length === 0 ? (
              <p className="text-gray-400 text-sm">No milestones yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {milestones.map((m, i) => (
                  <MilestoneCard
                    key={i}
                    milestone={m}
                    index={i}
                    campaign={campaign}
                    isCreator={isCreator}
                    isBacker={isBacker}
                    hasVoted={myVotes[i] ?? false}
                    onRequestPayout={() => requestMilestonePayout(campaignId, BigInt(i))}
                    onVote={(approve) => voteOnMilestone(campaignId, BigInt(i), approve)}
                    txLoading={tx.loading}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Backers */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Backers</h2>
            <p className="text-gray-500 text-sm">
              {Number(campaign.contributorCount)} contributor
              {Number(campaign.contributorCount) !== 1 ? "s" : ""} have backed this campaign.
            </p>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-5">
          {/* Funding stats */}
          <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatEth(campaign.raisedAmount)} ETH
              </div>
              <div className="text-sm text-gray-400">
                raised of {formatEth(campaign.goal)} ETH goal
              </div>
            </div>
            <ProgressBar percent={pct} />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{Number(campaign.contributorCount)} backers</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <div className="border-t border-gray-100 pt-3 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Deadline</span>
                <span className="font-medium text-gray-700">{formatDeadline(campaign.deadline)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Time left</span>
                <span className="font-medium text-gray-700">{timeRemaining(campaign.deadline)}</span>
              </div>
            </div>
          </div>

          {/* Settle campaign */}
          {campaign.status === 0 && isDeadlinePassed && (
            <button
              onClick={() => settleCampaign(campaignId)}
              disabled={tx.loading}
              className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Settle Campaign
            </button>
          )}

          {/* Contribute */}
          {campaign.status === 0 && !isDeadlinePassed && (
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Back this project</h3>
              {!isConnected ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-gray-500 text-center">
                    Connect your wallet to contribute
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <form onSubmit={handleContribute} className="flex flex-col gap-3">
                  {myContribution > 0n && (
                    <div className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
                      Your contribution: {formatEth(myContribution, 6)} ETH
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      placeholder="Amount in ETH"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={tx.loading}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {tx.loading ? "…" : "Fund campaign"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Refund */}
          {campaign.status === 2 && isBacker && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
              <h3 className="font-semibold text-red-800 mb-1">Campaign Failed</h3>
              <p className="text-red-600 text-sm mb-3">
                Claim a full refund of your {formatEth(myContribution, 6)} ETH.
              </p>
              <button
                onClick={() => claimRefund(campaignId)}
                disabled={tx.loading}
                className="w-full py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-60"
              >
                {tx.loading ? "Processing…" : "Claim Refund"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Milestone Card ────────────────────────────────────────────────────────────

function MilestoneCard({
  milestone, index, campaign, isCreator, isBacker, hasVoted, onRequestPayout, onVote, txLoading,
}: {
  milestone: Milestone;
  index: number;
  campaign: Campaign;
  isCreator: boolean;
  isBacker: boolean;
  hasVoted: boolean;
  onRequestPayout: () => void;
  onVote: (approve: boolean) => void;
  txLoading: boolean;
}) {
  const approvalPct =
    Number(campaign.contributorCount) > 0
      ? Math.round((Number(milestone.approvalVotes) / Number(campaign.contributorCount)) * 100)
      : 0;
  const rejectionPct =
    Number(campaign.contributorCount) > 0
      ? Math.round((Number(milestone.rejectionVotes) / Number(campaign.contributorCount)) * 100)
      : 0;

  const canRequestPayout =
    isCreator &&
    !milestone.votingOpen &&
    !milestone.completed &&
    (campaign.status === 1 || campaign.status === 0) &&
    campaign.raisedAmount >= campaign.goal;

  const canVote = isBacker && milestone.votingOpen && !hasVoted;

  return (
    <div
      className={`rounded-xl border p-4 ${
        milestone.approved
          ? "border-green-200 bg-green-50"
          : milestone.completed && !milestone.approved
          ? "border-red-100 bg-red-50"
          : milestone.votingOpen
          ? "border-indigo-200 bg-indigo-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-xs flex items-center justify-center font-bold text-gray-500">
            {index + 1}
          </span>
          <div>
            <div className="font-medium text-gray-800 text-sm">{milestone.title}</div>
            <div className="text-xs text-gray-500">{formatEth(milestone.amount)} ETH</div>
          </div>
        </div>
        <MilestoneStatus milestone={milestone} />
      </div>

      {milestone.votingOpen && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {Number(milestone.approvalVotes)} approve / {Number(milestone.rejectionVotes)} reject
            </span>
            <span>{approvalPct}% approval</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${approvalPct}%` }} />
            <div className="h-full bg-red-400 transition-all" style={{ width: `${rejectionPct}%` }} />
          </div>
          {milestone.votingDeadline > 0n && (
            <div className="text-xs text-gray-400">
              Voting ends: {formatDeadline(milestone.votingDeadline)}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2 flex-wrap">
        {canRequestPayout && (
          <button
            onClick={onRequestPayout}
            disabled={txLoading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            Request Payout
          </button>
        )}
        {canVote && (
          <>
            <button
              onClick={() => onVote(true)}
              disabled={txLoading}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onVote(false)}
              disabled={txLoading}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              ✕ Reject
            </button>
          </>
        )}
        {hasVoted && milestone.votingOpen && (
          <span className="text-xs text-gray-500 italic py-1.5">You already voted</span>
        )}
      </div>
    </div>
  );
}

function MilestoneStatus({ milestone }: { milestone: Milestone }) {
  if (milestone.approved)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">✓ Released</span>;
  if (milestone.completed && !milestone.approved)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">Rejected</span>;
  if (milestone.votingOpen)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium whitespace-nowrap animate-pulse">Voting open</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium whitespace-nowrap">Pending</span>;
}
