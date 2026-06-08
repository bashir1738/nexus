import Link from "next/link";
import ProgressBar from "./ProgressBar";
import {
  formatEth,
  formatDeadline,
  progressPercent,
  STATUS_LABELS,
  STATUS_COLORS,
  timeRemaining,
} from "@/lib/utils";

interface Campaign {
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

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = progressPercent(campaign.raisedAmount, campaign.goal);

  return (
    <Link
      href={`/campaigns/${campaign.id.toString()}`}
      className="flex flex-col bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden group"
    >
      <div className="h-2 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-snug line-clamp-2">
            {campaign.title}
          </h3>
          <span
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[campaign.status]}`}
          >
            {STATUS_LABELS[campaign.status]}
          </span>
        </div>

        <p className="text-gray-500 text-sm line-clamp-2">{campaign.description}</p>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-900">{formatEth(campaign.raisedAmount)} ETH</span>
            <span className="text-gray-400">of {formatEth(campaign.goal)} ETH</span>
          </div>
          <ProgressBar percent={pct} />
          <div className="flex justify-between text-xs text-gray-400 pt-0.5">
            <span>{Number(campaign.contributorCount)} backers</span>
            <span>
              {campaign.status === 0
                ? timeRemaining(campaign.deadline)
                : `Ended ${formatDeadline(campaign.deadline)}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
