import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Nexus Fund",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "d13df8bf5d2b845d33314164cad7ef3f",
  chains: [sepolia],
  ssr: true,
});
