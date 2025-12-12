"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  TrendingUp, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  Globe
} from "lucide-react";
import LightningIcon from "@/assets/lightning.svg";

export default function LandingResponsive() {
  return (
    <div className="bg-[#020618] relative min-h-screen w-full">
      {/* Header */}
      <header className="bg-[#0f172b] border-b border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1063px] h-[70px] flex items-center justify-between px-4">
          <Link href="/landing" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-chart-1 to-chart-2 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-slate-100 text-[20px] leading-[28px]">LSTM-GARCH</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in" className="text-slate-100 text-[16px] leading-[24px] h-10 px-4 rounded-[12px] hover:bg-white/5 transition-colors flex items-center">Login</Link>
            <Link href="/sign-up" className="h-10 rounded-[12px] px-4 text-slate-100 bg-[#f79d00] hover:bg-[#f79d00]/90 transition-colors flex items-center">Get Started</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-[1063px] px-4">
        <div className="mx-auto mt-[128px] grid place-items-center" style={{ maxWidth: 896 }}>
          {/* badge */}
          <div className="h-[38px] rounded-full border border-[#1e283d] bg-[rgba(247,157,0,0.2)] px-3 flex items-center gap-2 w-fit">
            <Image src={LightningIcon} alt="badge" width={16} height={16} className="h-4 w-4 shrink-0" />
            <span className="text-[14px] leading-[20px] text-[#f79d00]">AI-Powered Portfolio Management</span>
          </div>

          {/* heading */}
          <h1
            className="mt-[24px] text-center text-transparent bg-clip-text text-[36px] leading-[43.2px] font-bold"
            style={{ backgroundImage: "linear-gradient(90deg, rgb(241,245,249) 0%, rgb(147,152,161) 100%)" }}
          >
            AI-Powered Portfolio Optimization for Smarter Investing
          </h1>

          {/* paragraph */}
          <p className="mt-[24px] text-center text-[#9398a1] text-[16px] leading-[24px] max-w-[666px]">
            Forecast. Optimize. Manage risk — all in one platform. Harness LSTM and GARCH models to make data-driven
            investment decisions on the Nairobi Securities Exchange.
          </p>

          {/* actions */}
          <div className="mt-[24px] flex items-center gap-4">
            <Link 
              href="/sign-up" 
              className="h-14 px-6 rounded-[12px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] bg-[#f79d00] hover:bg-[#f79d00]/90 text-[#f1f5f9] text-[16px] leading-[24px] flex items-center justify-center transition-colors font-normal whitespace-nowrap"
            >
              Get Started
            </Link>
            <Link 
              href="/dashboard" 
              className="h-14 px-6 rounded-[12px] border border-[#1e283d] hover:bg-white/5 text-[#f1f5f9] text-[16px] leading-[24px] flex items-center justify-center transition-colors font-normal whitespace-nowrap"
            >
              View Demo
            </Link>
          </div>

          {/* stats */}
          <div className="mt-[48px] grid grid-cols-3 gap-8 w-full max-w-[576px]">
            <div className="text-center">
              <div className="text-[#f79d00] text-[24px] leading-[33.6px] font-semibold">98.5%</div>
              <div className="text-[#9398a1] text-[16px] leading-[24px]">Forecast Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-[#0086ff] text-[24px] leading-[33.6px] font-semibold">2.15</div>
              <div className="text-[#9398a1] text-[16px] leading-[24px]">Avg Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-[#00b670] text-[24px] leading-[33.6px] font-semibold">KES 5B+</div>
              <div className="text-[#9398a1] text-[16px] leading-[24px]">Assets Managed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-[81px] border-t border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1024px] px-4 py-20">
          <div className="text-center">
            <h2 className="text-[30px] leading-[39px] text-slate-100 font-bold">Powerful Features for Professional Investors</h2>
            <p className="mt-4 text-[16px] leading-[24px] text-[#9398a1] max-w-[616px] mx-auto">
              Everything you need to analyze, forecast, and optimize your investment portfolio with cutting-edge machine
              learning.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1024px]">
            {[
              { icon: TrendingUp, title: "LSTM Stock Forecasts", desc: "Advanced neural networks predict future stock prices with high accuracy and confidence intervals." },
              { icon: Activity, title: "Volatility Modeling", desc: "GARCH models quantify risk and volatility clustering for better risk management decisions." },
              { icon: PieChart, title: "Portfolio Optimization", desc: "Maximize Sharpe ratio with AI-driven asset allocation on the efficient frontier." },
              { icon: LineChart, title: "Efficient Frontier Visualization", desc: "Interactive charts reveal optimal risk-return trade-offs for your portfolio." },
              { icon: BarChart3, title: "Risk-Adjusted Metrics", desc: "Comprehensive analytics including Sharpe, Sortino, Beta, Alpha, and Value-at-Risk." },
              { icon: Globe, title: "Real-Time Market Data", desc: "Live quotes, heatmaps, and curated news feed from the Nairobi Securities Exchange." },
            ].map((f) => {
              const IconComponent = f.icon;
              return (
                <article key={f.title} className="rounded-[12px] border border-[#1e283d] bg-[#0f172b] p-6 h-full">
                  <div className="h-12 w-12 rounded-[12px] bg-[rgba(15,23,43,0.1)] grid place-items-center mb-4">
                    <IconComponent className="h-6 w-6 text-slate-100" />
                  </div>
                  <h3 className="text-slate-100 text-[24px] leading-[33.6px] font-semibold mb-2">{f.title}</h3>
                  <p className="text-[#9398a1] text-[16px] leading-[24px]">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1024px] px-4 py-20">
          <div className="text-center mb-8">
            <h2 className="text-[30px] leading-[39px] text-slate-100 font-bold">How It Works</h2>
            <p className="text-[16px] leading-[24px] text-[#9398a1]">From data to decision in three simple steps</p>
          </div>

          <div className="space-y-8">
            {[
              { n: "01", t: "Analyze & Forecast", d: "Run LSTM models to predict future stock prices and GARCH models to quantify volatility and risk." },
              { n: "02", t: "Optimize Portfolio", d: "Use AI-driven optimization to find the ideal asset allocation that maximizes your Sharpe ratio." },
              { n: "03", t: "Monitor & Rebalance", d: "Track performance with real-time metrics, alerts, and automated rebalancing recommendations." },
            ].map((s) => (
              <div key={s.n} className="rounded-[12px] border border-[#1e283d] bg-[#0f172b] p-6 flex gap-6 items-start">
                <div className="h-16 w-16 rounded-[12px] grid place-items-center shrink-0">
                  <span className="text-slate-50 text-[24px] leading-[32px]">{s.n}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-slate-100 text-[24px] leading-[33.6px] font-semibold">{s.t}</h3>
                  <p className="text-[#9398a1] text-[16px] leading-[24px]">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1024px] px-[128px] py-20">
          <div className="rounded-[16px] p-12 text-center bg-gradient-to-br from-[#2a2a7e] to-[#2a2a7eCC]">
            <h2 className="text-slate-50 text-[30px] leading-[39px] font-bold mb-2">
              Ready to Transform Your Investment Strategy?
            </h2>
            <p className="text-[rgba(248,250,252,0.9)] text-[16px] leading-[24px] mb-6 max-w-[647px] mx-auto">
              Join hundreds of investors, analysts, and portfolio managers using AI-powered insights to drive better returns.
            </p>
            <Link 
              href="/sign-up" 
              className="inline-flex items-center justify-center h-14 px-6 rounded-[12px] bg-white hover:bg-white/90 text-[#0f172b] text-[16px] leading-[24px] font-normal transition-colors whitespace-nowrap"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1024px] px-4 h-[89px] flex items-center justify-between">
          <p className="text-[#9398a1] text-[16px] leading-[24px]">© {new Date().getFullYear()} LSTM-GARCH Platform. All rights reserved.</p>
          <nav className="flex items-center gap-6 text-[#9398a1] text-[14px] leading-[20px]">
            <button className="hover:text-slate-100 transition-colors">Privacy Policy</button>
            <button className="hover:text-slate-100 transition-colors">Terms of Service</button>
            <button className="hover:text-slate-100 transition-colors">Contact</button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
