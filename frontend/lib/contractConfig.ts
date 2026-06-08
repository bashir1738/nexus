// Contract address: populated by deploy script OR by NEXT_PUBLIC_CONTRACT_ADDRESS env var
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string) ;
export const BACKER_BADGE_ADDRESS =
  (process.env.NEXT_PUBLIC_BACKER_BADGE_ADDRESS as string) ;
export const NETWORK_NAME = "sepolia";
export const CHAIN_ID =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

export const ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_backerBadge", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "EnforcedPause", "type": "error" },
  { "inputs": [], "name": "ExpectedPause", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnableInvalidOwner", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "goal", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "CampaignCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "ContributionReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "FundsReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" }
    ],
    "name": "MilestoneApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "MilestoneRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "address", "name": "account", "type": "address" }],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "RefundClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "address", "name": "account", "type": "address" }],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "voter", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "VOTING_PERIOD",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" }
    ],
    "name": "addMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "backerBadge",
    "outputs": [{ "internalType": "contract BackerBadge", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "campaignCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "campaignMilestones",
    "outputs": [
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bool", "name": "completed", "type": "bool" },
      { "internalType": "bool", "name": "approved", "type": "bool" },
      { "internalType": "bool", "name": "votingOpen", "type": "bool" },
      { "internalType": "uint256", "name": "approvalVotes", "type": "uint256" },
      { "internalType": "uint256", "name": "rejectionVotes", "type": "uint256" },
      { "internalType": "uint256", "name": "votingDeadline", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "campaigns",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address payable", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "uint256", "name": "goal", "type": "uint256" },
      { "internalType": "uint256", "name": "raisedAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "enum CrowdfundingEscrow.CampaignStatus", "name": "status", "type": "uint8" },
      { "internalType": "uint256", "name": "contributorCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "claimRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "contributions",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "uint256", "name": "_goal", "type": "uint256" },
      { "internalType": "uint256", "name": "_duration", "type": "uint256" }
    ],
    "name": "createCampaign",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "finalizeMilestoneVoting",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCampaigns",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address payable", "name": "creator", "type": "address" },
          { "internalType": "string", "name": "title", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "goal", "type": "uint256" },
          { "internalType": "uint256", "name": "raisedAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "enum CrowdfundingEscrow.CampaignStatus", "name": "status", "type": "uint8" },
          { "internalType": "uint256", "name": "contributorCount", "type": "uint256" }
        ],
        "internalType": "struct CrowdfundingEscrow.Campaign[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "getCampaign",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address payable", "name": "creator", "type": "address" },
          { "internalType": "string", "name": "title", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "goal", "type": "uint256" },
          { "internalType": "uint256", "name": "raisedAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "enum CrowdfundingEscrow.CampaignStatus", "name": "status", "type": "uint8" },
          { "internalType": "uint256", "name": "contributorCount", "type": "uint256" }
        ],
        "internalType": "struct CrowdfundingEscrow.Campaign",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "getContributors",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" },
      { "internalType": "address", "name": "_voter", "type": "address" }
    ],
    "name": "getMilestoneVoteStatus",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "getMilestones",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "title", "type": "string" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "bool", "name": "completed", "type": "bool" },
          { "internalType": "bool", "name": "approved", "type": "bool" },
          { "internalType": "bool", "name": "votingOpen", "type": "bool" },
          { "internalType": "uint256", "name": "approvalVotes", "type": "uint256" },
          { "internalType": "uint256", "name": "rejectionVotes", "type": "uint256" },
          { "internalType": "uint256", "name": "votingDeadline", "type": "uint256" }
        ],
        "internalType": "struct CrowdfundingEscrow.Milestone[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "milestoneVoted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "refundClaimed",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "requestMilestonePayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "settleCampaign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" },
      { "internalType": "bool", "name": "_approve", "type": "bool" }
    ],
    "name": "voteOnMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
