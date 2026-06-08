// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @notice NFT badge minted to every campaign backer as proof of contribution
contract BackerBadge is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    struct BadgeData {
        string campaignTitle;
        uint256 amountContributed;
        uint256 contributionDate;
        uint256 campaignId;
    }

    mapping(uint256 => BadgeData) public badgeData;

    constructor(address initialOwner) ERC721("CrowdFund Backer Badge", "CFBB") Ownable(initialOwner) {}

    function mint(
        address to,
        string memory campaignTitle,
        uint256 amountContributed,
        uint256 campaignId
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        badgeData[tokenId] = BadgeData({
            campaignTitle: campaignTitle,
            amountContributed: amountContributed,
            contributionDate: block.timestamp,
            campaignId: campaignId
        });

        _setTokenURI(tokenId, _buildTokenURI(tokenId));
        return tokenId;
    }

    function _buildTokenURI(uint256 tokenId) internal view returns (string memory) {
        BadgeData memory d = badgeData[tokenId];
        bytes memory json = abi.encodePacked(
            '{"name":"Backer Badge #',
            tokenId.toString(),
            '","description":"Proof of contribution to campaign: ',
            d.campaignTitle,
            '","attributes":[',
            '{"trait_type":"Campaign","value":"',
            d.campaignTitle,
            '"},{"trait_type":"Amount Contributed (wei)","value":',
            d.amountContributed.toString(),
            '},{"trait_type":"Contribution Date","value":',
            d.contributionDate.toString(),
            '},{"trait_type":"Campaign ID","value":',
            d.campaignId.toString(),
            "}]}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }
}

/// @notice Decentralized crowdfunding platform with milestone-based escrow
contract CrowdfundingEscrow is ReentrancyGuard, Ownable, Pausable {
    using Strings for uint256;

    BackerBadge public immutable backerBadge;

    uint256 public constant VOTING_PERIOD = 7 days;

    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Completed
    }

    struct Milestone {
        string title;
        uint256 amount;
        bool completed;
        bool approved;
        bool votingOpen;
        uint256 approvalVotes;
        uint256 rejectionVotes;
        uint256 votingDeadline;
    }

    struct Campaign {
        uint256 id;
        address payable creator;
        string title;
        string description;
        uint256 goal;
        uint256 raisedAmount;
        uint256 deadline;
        CampaignStatus status;
        uint256 contributorCount;
    }

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Milestone[]) public campaignMilestones;
    mapping(uint256 => address[]) private _contributorList;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => bool)) public refundClaimed;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public milestoneVoted;
    mapping(uint256 => mapping(address => bool)) private _badgeMinted;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );
    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );
    event MilestoneRequested(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        string title,
        uint256 amount
    );
    event VoteCast(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed voter,
        bool approved
    );
    event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneIndex);
    event FundsReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        uint256 amount
    );
    event RefundClaimed(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    constructor(address _backerBadge) Ownable(msg.sender) {
        backerBadge = BackerBadge(_backerBadge);
    }

    // ─── Campaign Management ────────────────────────────────────────────────

    function createCampaign(
        string calldata _title,
        string calldata _description,
        uint256 _goal,
        uint256 _duration
    ) external whenNotPaused returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_description).length > 0, "Description required");
        require(_goal > 0, "Goal must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        uint256 campaignId = campaignCount++;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            raisedAmount: 0,
            deadline: block.timestamp + _duration,
            status: CampaignStatus.Active,
            contributorCount: 0
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _title,
            _goal,
            block.timestamp + _duration
        );
        return campaignId;
    }

    function addMilestone(
        uint256 _campaignId,
        string calldata _title,
        uint256 _amount
    ) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only creator");
        require(campaign.status == CampaignStatus.Active, "Campaign not active");
        require(bytes(_title).length > 0, "Title required");
        require(_amount > 0, "Amount must be greater than 0");

        campaignMilestones[_campaignId].push(
            Milestone({
                title: _title,
                amount: _amount,
                completed: false,
                approved: false,
                votingOpen: false,
                approvalVotes: 0,
                rejectionVotes: 0,
                votingDeadline: 0
            })
        );
    }

    // ─── Funding ────────────────────────────────────────────────────────────

    function contribute(uint256 _campaignId) external payable whenNotPaused nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign not active");
        require(block.timestamp < campaign.deadline, "Campaign deadline passed");
        require(msg.value > 0, "Must send ETH");

        if (contributions[_campaignId][msg.sender] == 0) {
            _contributorList[_campaignId].push(msg.sender);
            campaign.contributorCount++;
        }
        contributions[_campaignId][msg.sender] += msg.value;
        campaign.raisedAmount += msg.value;

        if (!_badgeMinted[_campaignId][msg.sender]) {
            _badgeMinted[_campaignId][msg.sender] = true;
            backerBadge.mint(msg.sender, campaign.title, msg.value, _campaignId);
        }

        emit ContributionReceived(_campaignId, msg.sender, msg.value);
    }

    /// @notice Call after deadline to settle campaign status
    function settleCampaign(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign not active");
        require(block.timestamp >= campaign.deadline, "Campaign still active");

        if (campaign.raisedAmount >= campaign.goal) {
            campaign.status = CampaignStatus.Successful;
        } else {
            campaign.status = CampaignStatus.Failed;
        }
    }

    // ─── Refunds ────────────────────────────────────────────────────────────

    function claimRefund(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Failed, "Campaign not failed");
        require(contributions[_campaignId][msg.sender] > 0, "No contribution found");
        require(!refundClaimed[_campaignId][msg.sender], "Refund already claimed");

        uint256 amount = contributions[_campaignId][msg.sender];
        refundClaimed[_campaignId][msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit RefundClaimed(_campaignId, msg.sender, amount);
    }

    // ─── Milestones & Voting ────────────────────────────────────────────────

    function requestMilestonePayout(uint256 _campaignId, uint256 _milestoneIndex)
        external
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only creator");
        require(
            campaign.status == CampaignStatus.Successful ||
                campaign.status == CampaignStatus.Active,
            "Goal not reached yet"
        );
        require(campaign.raisedAmount >= campaign.goal, "Goal not reached");
        require(
            _milestoneIndex < campaignMilestones[_campaignId].length,
            "Invalid milestone"
        );

        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneIndex];
        require(!milestone.completed, "Milestone already completed");
        require(!milestone.votingOpen, "Voting already open");

        milestone.votingOpen = true;
        milestone.votingDeadline = block.timestamp + VOTING_PERIOD;

        emit MilestoneRequested(
            _campaignId,
            _milestoneIndex,
            milestone.title,
            milestone.amount
        );
    }

    function voteOnMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        bool _approve
    ) external nonReentrant {
        require(contributions[_campaignId][msg.sender] > 0, "Not a contributor");
        require(
            _milestoneIndex < campaignMilestones[_campaignId].length,
            "Invalid milestone"
        );

        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneIndex];
        require(milestone.votingOpen, "Voting not open");
        require(block.timestamp < milestone.votingDeadline, "Voting period ended");
        require(
            !milestoneVoted[_campaignId][_milestoneIndex][msg.sender],
            "Already voted"
        );

        milestoneVoted[_campaignId][_milestoneIndex][msg.sender] = true;

        if (_approve) {
            milestone.approvalVotes++;
        } else {
            milestone.rejectionVotes++;
        }

        emit VoteCast(_campaignId, _milestoneIndex, msg.sender, _approve);

        _tryFinalizeMilestone(_campaignId, _milestoneIndex);
    }

    /// @notice Finalize voting after the voting period ends
    function finalizeMilestoneVoting(uint256 _campaignId, uint256 _milestoneIndex)
        external
        nonReentrant
    {
        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneIndex];
        require(milestone.votingOpen, "Voting not open");
        require(block.timestamp >= milestone.votingDeadline, "Voting period not ended");

        milestone.votingOpen = false;
        _tryFinalizeMilestone(_campaignId, _milestoneIndex);
    }

    function _tryFinalizeMilestone(uint256 _campaignId, uint256 _milestoneIndex)
        internal
    {
        Campaign storage campaign = campaigns[_campaignId];
        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneIndex];

        if (milestone.completed) return;

        uint256 totalContributors = campaign.contributorCount;
        if (totalContributors == 0) return;

        // More than 50% approve → release
        if (milestone.approvalVotes * 2 > totalContributors) {
            milestone.approved = true;
            milestone.completed = true;
            milestone.votingOpen = false;

            emit MilestoneApproved(_campaignId, _milestoneIndex);

            uint256 amount = milestone.amount;
            require(address(this).balance >= amount, "Insufficient escrow balance");

            (bool success, ) = campaign.creator.call{value: amount}("");
            require(success, "Transfer failed");

            emit FundsReleased(_campaignId, _milestoneIndex, amount);

            _checkCampaignCompletion(_campaignId);
        }
    }

    function _checkCampaignCompletion(uint256 _campaignId) internal {
        Milestone[] storage milestones = campaignMilestones[_campaignId];
        if (milestones.length == 0) return;

        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].completed) return;
        }
        campaigns[_campaignId].status = CampaignStatus.Completed;
    }

    // ─── View helpers ───────────────────────────────────────────────────────

    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getMilestones(uint256 _campaignId)
        external
        view
        returns (Milestone[] memory)
    {
        return campaignMilestones[_campaignId];
    }

    function getContributors(uint256 _campaignId)
        external
        view
        returns (address[] memory)
    {
        return _contributorList[_campaignId];
    }

    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory all = new Campaign[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            all[i] = campaigns[i];
        }
        return all;
    }

    function getMilestoneVoteStatus(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        address _voter
    ) external view returns (bool) {
        return milestoneVoted[_campaignId][_milestoneIndex][_voter];
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
