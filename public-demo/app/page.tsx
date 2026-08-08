import type { Metadata } from "next";
import { PublicDashboard } from "./PublicDashboard";

export const metadata: Metadata = {
  title: "InfinityAtlas Climate & Health MRV Toolkit",
  description:
    "Controlled public demonstration of territorial climate and health MRV for San Cristóbal, Galapagos.",
};

export default function Home() {
  return <PublicDashboard />;
}
