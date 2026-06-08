import { network } from "hardhat";

const BACKER_BADGE   = "0xF15BEDd24ce307DD27156AA00682D90222d4fEd6";
const CROWDFUNDING   = "0x85d043Fe588A3c85F9f21B2119939D71cCd4932b";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Re-attach to the already-deployed BackerBadge by address
  const badge = await ethers.getContractAt("BackerBadge", BACKER_BADGE, deployer);
  const currentOwner = await badge.owner();
  console.log("BackerBadge current owner:", currentOwner);

  if (currentOwner.toLowerCase() === CROWDFUNDING.toLowerCase()) {
    console.log("✅ Ownership already transferred.");
    return;
  }

  const tx = await badge.transferOwnership(CROWDFUNDING);
  console.log("tx hash:", tx.hash);
  await tx.wait();

  const newOwner = await badge.owner();
  console.log("BackerBadge new owner:", newOwner);
  console.log(
    newOwner.toLowerCase() === CROWDFUNDING.toLowerCase()
      ? "✅ Ownership transferred!"
      : "❌ Owner mismatch"
  );
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
