"use client";

import Link from "next/link";
import { TrendingUp, Check } from "lucide-react";
import Verify2FAForm from "./verify-2fa-form";

interface Verify2FAContentProps {
  email: string;
}

export default function Verify2FAContent({ email }: Verify2FAContentProps) {
  return (
    <div className="min-h-screen bg-[#020618] flex items-center justify-center p-4">
      <div className="w-full max-w-[1063px] flex flex-col lg:flex-row gap-8 lg:gap-0">
        {/* Left Panel - Branding */}
        <div className="w-full lg:w-[531.5px] flex items-center justify-center lg:pr-8">
          <div className="w-full max-w-[435.5px] space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-slate-50" />
              </div>
              <h1 className="text-2xl font-normal text-slate-50">LSTM-GARCH</h1>
            </div>

            {/* Heading */}
            <div>
              <h2 className="text-[30px] font-bold leading-[39px] text-slate-50 mb-4">
                AI-Powered Portfolio Management
              </h2>
              <p className="text-base leading-6 text-slate-50/90">
                Make smarter investment decisions with machine learning-driven forecasts and risk analysis.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {[
                "LSTM price forecasting with 98%+ accuracy",
                "GARCH volatility modeling for risk management",
                "Efficient frontier portfolio optimization",
                "Real-time NSE market data and insights",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-slate-50" />
                  </div>
                  <p className="text-base leading-6 text-slate-50/90">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full lg:w-[448px] flex flex-col gap-8 pt-8 lg:pt-0">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-[36px] font-bold leading-[43.2px] text-slate-100">Verify Your Identity</h1>
            <p className="text-base leading-6 text-[#9398a1]">
              We&apos;ve sent a 6-digit verification code to {email}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <Verify2FAForm email={email} />
          </div>
        </div>
      </div>
    </div>
  );
}

