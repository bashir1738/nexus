"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWeb3 } from "@/lib/web3Context";

interface MilestoneInput {
  title: string;
  amountEth: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createCampaign, addMilestone, tx, isCorrectNetwork } = useWeb3();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalEth, setGoalEth] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([{ title: "", amountEth: "" }]);
  const [step, setStep] = useState<"form" | "adding-milestones" | "done">("form");

  const addMilestoneInput = () =>
    setMilestones((prev) => [...prev, { title: "", amountEth: "" }]);

  const removeMilestoneInput = (i: number) =>
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));

  const updateMilestone = (i: number, field: keyof MilestoneInput, value: string) =>
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));

  const milestonesTotal = milestones.reduce((sum, m) => {
    try { return sum + parseFloat(m.amountEth || "0"); } catch { return sum; }
  }, 0);

  const goalNum = parseFloat(goalEth || "0");
  const milestonesMismatch = milestones.length > 0 && milestonesTotal > 0 && Math.abs(milestonesTotal - goalNum) > 0.0001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    const campaignId = await createCampaign(title, description, goalEth, durationDays);
    if (campaignId === null) return;

    setStep("adding-milestones");
    for (const m of milestones.filter((m) => m.title && m.amountEth)) {
      const ok = await addMilestone(campaignId, m.title, m.amountEth);
      if (!ok) return;
    }

    setStep("done");
    setTimeout(() => router.push(`/campaigns/${campaignId.toString()}`), 1500);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-3xl">
          🔒
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            Connect your wallet to create a campaign
          </h2>
          <p className="text-gray-500 text-sm">
            You need a wallet connected to Sepolia testnet.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            Wrong network
          </h2>
          <p className="text-gray-500 text-sm">
            Please switch your wallet to <strong>Sepolia</strong> testnet to continue.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Launch a Campaign</h1>
        <p className="text-gray-500 mt-1">
          Set your goal and define milestones — backers vote to release each payment.
        </p>
      </div>

      {step === "done" ? (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-10 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-semibold text-green-800 mb-1">Campaign Created!</h2>
          <p className="text-green-600 text-sm">Redirecting to your campaign…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Campaign details */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800">Campaign Details</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My awesome project"
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project, what you're building, and how funds will be used…"
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Funding Goal (ETH) *</label>
                <input
                  required
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={goalEth}
                  onChange={(e) => setGoalEth(e.target.value)}
                  placeholder="1.0"
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Duration (Days) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="rounded-2xl bg-white border border-gray-200 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Milestones</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Funds are released per milestone after backer approval.
                </p>
              </div>
              <button
                type="button"
                onClick={addMilestoneInput}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add
              </button>
            </div>

            {milestones.map((m, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex-1 flex gap-2">
                  <input
                    value={m.title}
                    onChange={(e) => updateMilestone(i, "title", e.target.value)}
                    placeholder={`Milestone ${i + 1} title`}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={m.amountEth}
                    onChange={(e) => updateMilestone(i, "amountEth", e.target.value)}
                    placeholder="ETH"
                    className="w-28 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                </div>
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestoneInput(i)}
                    className="text-red-400 hover:text-red-600 mt-2 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {goalNum > 0 && milestonesTotal > 0 && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  milestonesMismatch
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                Milestones total: <strong>{milestonesTotal.toFixed(4)} ETH</strong> / Goal:{" "}
                <strong>{goalNum.toFixed(4)} ETH</strong>
                {milestonesMismatch && " — totals don't match"}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={tx.loading || step !== "form"}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {tx.loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {step === "adding-milestones" ? "Adding milestones…" : "Creating campaign…"}
              </>
            ) : (
              "Launch Campaign"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
