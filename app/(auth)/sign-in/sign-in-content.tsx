"use client";

import Link from "next/link";
import { TrendingUp, Check } from "lucide-react";
import CredentialsSignInForm from "./credentials-signin-form";
import GoogleSignInButton from "./google-signin-button";

interface SignInContentProps {
  callbackUrl: string;
}

export default function SignInContent({ callbackUrl }: SignInContentProps) {
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
            <h1 className="text-[36px] font-bold leading-[43.2px] text-slate-100">Sign In</h1>
            <p className="text-base leading-6 text-[#9398a1]">
              Welcome back! Sign in to access your dashboard.
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-[#1e283d] rounded-xl p-1 flex gap-2">
            <Link
              href="/sign-in"
              className="flex-1 h-12 bg-[#020618] rounded-lg shadow-sm flex items-center justify-center text-base text-slate-100"
            >
              Login
            </Link>
            <Link
              href="/sign-up"
              className="flex-1 h-12 rounded-lg flex items-center justify-center text-base text-slate-100 hover:bg-white/5 transition-colors"
            >
              Register
            </Link>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <CredentialsSignInForm />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1e283d]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#020618] px-2 text-sm text-[#9398a1]">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <GoogleSignInButton />

            {/* Sign Up Link */}
            <p className="text-center text-base text-[#9398a1]">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-[#f79d00] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

