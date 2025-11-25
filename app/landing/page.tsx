import LandingResponsive from "@/components/figma/LandingResponsive";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "LSTM-GARCH - AI-Powered Portfolio Optimization",
  description: "Forecast. Optimize. Manage risk — all in one platform. Harness LSTM and GARCH models to make data-driven investment decisions on the Nairobi Securities Exchange.",
};

export default function LandingPage() {
  return <LandingResponsive />;
}

