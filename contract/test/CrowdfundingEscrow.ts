import { expect } from "chai";
import { network } from "hardhat";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const { ethers, networkHelpers } = await network.create();

const ONE_ETH = ethers.parseEther("1");
const HALF_ETH = ethers.parseEther("0.5");
const ONE_DAY = 24 * 60 * 60;
const THIRTY_DAYS = 30 * ONE_DAY;
const SEVEN_DAYS = 7 * ONE_DAY;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

async function deployCrowdfundingFixture() {
  const [owner, creator, backer1, backer2, backer3] = await ethers.getSigners();
  // Deploy BackerBadge first (owner = deployer), then pass its address to escrow
  const badge = await ethers.deployContract("BackerBadge", [owner.address]);
  const badgeAddr = await badge.getAddress();
  const contract = await ethers.deployContract("CrowdfundingEscrow", [badgeAddr]);
  const contractAddr = await contract.getAddress();
  // Transfer badge ownership to the escrow so it can mint
  await badge.transferOwnership(contractAddr);
  return { contract, badge, owner, creator, backer1, backer2, backer3 };
}

async function deployWithCampaignFixture() {
  const base = await deployCrowdfundingFixture();
  const { contract, creator } = base;

  await contract.connect(creator).createCampaign(
    "Test Campaign",
    "A test campaign description",
    ONE_ETH,
    THIRTY_DAYS
  );
  await contract.connect(creator).addMilestone(0n, "Milestone 1", HALF_ETH);
  await contract.connect(creator).addMilestone(0n, "Milestone 2", HALF_ETH);

  return { ...base, campaignId: 0n };
}

async function deployWithSuccessfulCampaignFixture() {
  const base = await deployWithCampaignFixture();
  const { contract, backer1, backer2 } = base;

  // Contribute before deadline — total reaches goal of 1 ETH
  await contract.connect(backer1).contribute(0n, { value: HALF_ETH });
  await contract.connect(backer2).contribute(0n, { value: HALF_ETH });

  // Advance past campaign deadline and settle
  await networkHelpers.time.increase(THIRTY_DAYS + 1);
  await contract.settleCampaign(0n);

  return base;
}

async function deployWithFailedCampaignFixture() {
  const base = await deployWithCampaignFixture();
  const { contract, backer1 } = base;

  // Only partial funding — campaign will fail
  await contract.connect(backer1).contribute(0n, { value: ethers.parseEther("0.1") });

  await networkHelpers.time.increase(THIRTY_DAYS + 1);
  await contract.settleCampaign(0n);

  return base;
}

// ─── Campaign Tests ────────────────────────────────────────────────────────────

describe("CrowdfundingEscrow", function () {
  describe("Campaign Creation", function () {
    it("create campaign: stores all fields and emits CampaignCreated", async function () {
      const { contract, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      await expect(
        contract.connect(creator).createCampaign("Test", "Desc", ONE_ETH, THIRTY_DAYS)
      ).to.emit(contract, "CampaignCreated");

      const campaign = await contract.getCampaign(0n);
      expect(campaign.title).to.equal("Test");
      expect(campaign.description).to.equal("Desc");
      expect(campaign.goal).to.equal(ONE_ETH);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.status).to.equal(0n); // Active
      expect(campaign.raisedAmount).to.equal(0n);
    });

    it("invalid campaign creation: empty title reverts", async function () {
      const { contract, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await expect(
        contract.connect(creator).createCampaign("", "Desc", ONE_ETH, THIRTY_DAYS)
      ).to.be.revertedWith("Title required");
    });

    it("invalid campaign creation: empty description reverts", async function () {
      const { contract, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await expect(
        contract.connect(creator).createCampaign("Title", "", ONE_ETH, THIRTY_DAYS)
      ).to.be.revertedWith("Description required");
    });

    it("invalid campaign creation: zero goal reverts", async function () {
      const { contract, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await expect(
        contract.connect(creator).createCampaign("Title", "Desc", 0n, THIRTY_DAYS)
      ).to.be.revertedWith("Goal must be greater than 0");
    });

    it("invalid campaign creation: zero duration reverts", async function () {
      const { contract, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await expect(
        contract.connect(creator).createCampaign("Title", "Desc", ONE_ETH, 0n)
      ).to.be.revertedWith("Duration must be greater than 0");
    });
  });

  // ─── Funding Tests ────────────────────────────────────────────────────────

  describe("Campaign Funding", function () {
    it("contribute successfully: updates raisedAmount and contributor record", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(deployWithCampaignFixture);

      await expect(
        contract.connect(backer1).contribute(0n, { value: HALF_ETH })
      ).to.emit(contract, "ContributionReceived");

      const campaign = await contract.getCampaign(0n);
      expect(campaign.raisedAmount).to.equal(HALF_ETH);
      expect(campaign.contributorCount).to.equal(1n);
      expect(await contract.contributions(0n, backer1.address)).to.equal(HALF_ETH);
    });

    it("contribution tracking: multiple backers tracked individually", async function () {
      const { contract, backer1, backer2 } = await networkHelpers.loadFixture(
        deployWithCampaignFixture
      );

      await contract.connect(backer1).contribute(0n, { value: HALF_ETH });
      await contract.connect(backer2).contribute(0n, { value: ethers.parseEther("0.3") });

      const campaign = await contract.getCampaign(0n);
      expect(campaign.raisedAmount).to.equal(ethers.parseEther("0.8"));
      expect(campaign.contributorCount).to.equal(2n);
      expect(await contract.contributions(0n, backer1.address)).to.equal(HALF_ETH);
      expect(await contract.contributions(0n, backer2.address)).to.equal(
        ethers.parseEther("0.3")
      );
    });

    it("contribution tracking: same backer contributing twice accumulates", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(deployWithCampaignFixture);

      await contract.connect(backer1).contribute(0n, { value: HALF_ETH });
      await contract.connect(backer1).contribute(0n, { value: HALF_ETH });

      expect(await contract.contributions(0n, backer1.address)).to.equal(ONE_ETH);
      // contributor count should not double-count
      expect((await contract.getCampaign(0n)).contributorCount).to.equal(1n);
    });

    it("contribute reverts after deadline", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(deployWithCampaignFixture);

      await networkHelpers.time.increase(THIRTY_DAYS + 1);
      await expect(
        contract.connect(backer1).contribute(0n, { value: HALF_ETH })
      ).to.be.revertedWith("Campaign deadline passed");
    });

    it("contribute reverts with zero ETH", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(deployWithCampaignFixture);
      await expect(
        contract.connect(backer1).contribute(0n, { value: 0n })
      ).to.be.revertedWith("Must send ETH");
    });
  });

  // ─── Refund Tests ─────────────────────────────────────────────────────────

  describe("Refund System", function () {
    it("refund after failed campaign: contributor receives ETH back", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(
        deployWithFailedCampaignFixture
      );

      const amount = await contract.contributions(0n, backer1.address);
      await expect(contract.connect(backer1).claimRefund(0n)).to.changeEtherBalance(
        ethers,
        backer1,
        amount
      );
    });

    it("refund after failed campaign: emits RefundClaimed", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(
        deployWithFailedCampaignFixture
      );

      await expect(contract.connect(backer1).claimRefund(0n)).to.emit(
        contract,
        "RefundClaimed"
      );
    });

    it("prevent double refunds: second claim reverts", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(
        deployWithFailedCampaignFixture
      );

      await contract.connect(backer1).claimRefund(0n);
      await expect(contract.connect(backer1).claimRefund(0n)).to.be.revertedWith(
        "Refund already claimed"
      );
    });

    it("non-contributor cannot claim refund", async function () {
      const { contract, backer2 } = await networkHelpers.loadFixture(
        deployWithFailedCampaignFixture
      );

      await expect(contract.connect(backer2).claimRefund(0n)).to.be.revertedWith(
        "No contribution found"
      );
    });

    it("refund reverts on non-failed campaign", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await expect(contract.connect(backer1).claimRefund(0n)).to.be.revertedWith(
        "Campaign not failed"
      );
    });
  });

  // ─── Voting Tests ─────────────────────────────────────────────────────────

  describe("Milestone Voting", function () {
    it("approve milestone: emits VoteCast and MilestoneApproved when majority approves", async function () {
      const { contract, creator, backer1, backer2 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await contract.connect(creator).requestMilestonePayout(0n, 0n);

      // Majority = 2/2 contributors must approve
      await expect(contract.connect(backer1).voteOnMilestone(0n, 0n, true)).to.emit(
        contract,
        "VoteCast"
      );
      await expect(contract.connect(backer2).voteOnMilestone(0n, 0n, true)).to.emit(
        contract,
        "MilestoneApproved"
      );

      const milestones = await contract.getMilestones(0n);
      expect(milestones[0].approved).to.equal(true);
      expect(milestones[0].completed).to.equal(true);
    });

    it("reject milestone: does not release funds when majority rejects", async function () {
      const { contract, creator, backer1, backer2 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await contract.connect(creator).requestMilestonePayout(0n, 0n);

      await contract.connect(backer1).voteOnMilestone(0n, 0n, false);
      await contract.connect(backer2).voteOnMilestone(0n, 0n, false);

      const milestones = await contract.getMilestones(0n);
      expect(milestones[0].approved).to.equal(false);
    });

    it("prevent double voting: second vote from same address reverts", async function () {
      const { contract, creator, backer1 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await contract.connect(creator).requestMilestonePayout(0n, 0n);
      await contract.connect(backer1).voteOnMilestone(0n, 0n, true);

      await expect(
        contract.connect(backer1).voteOnMilestone(0n, 0n, true)
      ).to.be.revertedWith("Already voted");
    });

    it("non-contributor cannot vote", async function () {
      const { contract, creator, backer3 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await contract.connect(creator).requestMilestonePayout(0n, 0n);

      await expect(
        contract.connect(backer3).voteOnMilestone(0n, 0n, true)
      ).to.be.revertedWith("Not a contributor");
    });

    it("voting reverts after voting period ends", async function () {
      const { contract, creator, backer1 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await contract.connect(creator).requestMilestonePayout(0n, 0n);
      await networkHelpers.time.increase(SEVEN_DAYS + 1);

      await expect(
        contract.connect(backer1).voteOnMilestone(0n, 0n, true)
      ).to.be.revertedWith("Voting period ended");
    });
  });

  // ─── Escrow Tests ─────────────────────────────────────────────────────────

  describe("Escrow & Fund Release", function () {
    it("release funds after approval: creator receives milestone amount", async function () {
      const { contract, creator, backer1, backer2 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await contract.connect(creator).requestMilestonePayout(0n, 0n);
      await contract.connect(backer1).voteOnMilestone(0n, 0n, true);

      const balanceBefore = await ethers.provider.getBalance(creator.address);
      await expect(
        contract.connect(backer2).voteOnMilestone(0n, 0n, true)
      ).to.emit(contract, "FundsReleased");
      const balanceAfter = await ethers.provider.getBalance(creator.address);

      expect(balanceAfter - balanceBefore).to.equal(HALF_ETH);
    });

    it("prevent unauthorized payout: non-creator cannot request milestone", async function () {
      const { contract, backer1 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      await expect(
        contract.connect(backer1).requestMilestonePayout(0n, 0n)
      ).to.be.revertedWith("Only creator");
    });

    it("cannot request payout before goal is reached", async function () {
      const { contract, creator } = await networkHelpers.loadFixture(deployWithCampaignFixture);

      await expect(
        contract.connect(creator).requestMilestonePayout(0n, 0n)
      ).to.be.revertedWith("Goal not reached");
    });

    it("campaign status becomes Completed when all milestones approved", async function () {
      const { contract, creator, backer1, backer2 } = await networkHelpers.loadFixture(
        deployWithSuccessfulCampaignFixture
      );

      // Approve milestone 0
      await contract.connect(creator).requestMilestonePayout(0n, 0n);
      await contract.connect(backer1).voteOnMilestone(0n, 0n, true);
      await contract.connect(backer2).voteOnMilestone(0n, 0n, true);

      // Approve milestone 1
      await contract.connect(creator).requestMilestonePayout(0n, 1n);
      await contract.connect(backer1).voteOnMilestone(0n, 1n, true);
      await contract.connect(backer2).voteOnMilestone(0n, 1n, true);

      const campaign = await contract.getCampaign(0n);
      expect(campaign.status).to.equal(3n); // Completed
    });
  });

  // ─── NFT Badge Tests ──────────────────────────────────────────────────────

  describe("NFT Backer Badges", function () {
    it("contributor receives NFT badge on first contribution", async function () {
      const { contract, badge, backer1 } = await networkHelpers.loadFixture(
        deployWithCampaignFixture
      );

      await contract.connect(backer1).contribute(0n, { value: HALF_ETH });

      expect(await badge.balanceOf(backer1.address)).to.equal(1n);
    });

    it("second contribution does not mint another badge", async function () {
      const { contract, badge, backer1 } = await networkHelpers.loadFixture(
        deployWithCampaignFixture
      );

      await contract.connect(backer1).contribute(0n, { value: HALF_ETH });
      await contract.connect(backer1).contribute(0n, { value: HALF_ETH });

      expect(await badge.balanceOf(backer1.address)).to.equal(1n);
    });
  });
});
