"use client";

import React from "react";

// Figma icon assets
const imgBadge = "http://localhost:3845/assets/4a35e705cebfec939b1a8ba514221c96c63f3b91.svg";
const icon1 = "http://localhost:3845/assets/56aa7e15c827d8a8edee0422bc598562e8924b96.svg"; // LSTM
const icon2 = "http://localhost:3845/assets/e6e50c272933c7db46f64c3b2d6aa99f1f58a5e2.svg"; // Volatility
const icon3 = "http://localhost:3845/assets/93349638703d4b2358363dbb37a0230bbafe7159.svg"; // Optimization
const icon4 = "http://localhost:3845/assets/04aa6fc55e5e28575180e544b5e6b97b537894dd.svg"; // Efficient Frontier
const icon5 = "http://localhost:3845/assets/6ceaad3cebf9e8e573ea956969ef4b525f47a67b.svg"; // Risk metrics
const icon6 = "http://localhost:3845/assets/ff5da02926ec0b862751a48d38a909cbfaea7de1.svg"; // Market data
const logo = "http://localhost:3845/assets/c2c8fe69e1f07376880d69787c35042c66652ba3.svg";

export default function LandingResponsive() {
  return (
    <div className="dark min-h-screen w-full bg-[#020618]">
      {/* Header */}
      <header className="border-b border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1063px] h-[70px] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="logo" className="h-10 w-10" />
            <span className="text-slate-100 text-[20px] leading-[28px]">LSTM-GARCH</span>
          </div>
          <nav className="flex items-center gap-4">
            <button className="text-slate-100 text-[16px] leading-[24px] h-10 px-4 rounded-[12px]">Login</button>
            <button className="h-10 rounded-[12px] px-4 text-slate-100 bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)]">Get Started</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-[1063px] px-4">
        <div className="mx-auto mt-[128px] grid place-items-center" style={{ maxWidth: 896 }}>
          {/* badge */}
          <div className="h-[38px] rounded-full border border-[#1e283d] bg-[rgba(247,157,0,0.2)] px-3 flex items-center gap-2">
            <img src={imgBadge} alt="badge" className="h-4 w-4" />
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
            <button className="h-14 px-6 rounded-[12px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)] text-slate-100 text-[16px]">
              Get Started
            </button>
            <button className="h-14 px-6 rounded-[12px] border border-[#1e283d] text-slate-100 text-[16px]">View Demo</button>
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
      <section className="mt-[82px] border-t border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1024px] px-4 py-20">
          <div className="text-center">
            <h2 className="text-[30px] leading-[39px] text-slate-100 font-bold">Powerful Features for Professional Investors</h2>
            <p className="mt-4 text-[16px] leading-[24px] text-[#9398a1] max-w-[616px] mx-auto">
              Everything you need to analyze, forecast, and optimize your investment portfolio with cutting-edge machine
              learning.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: icon1, title: "LSTM Stock Forecasts", desc: "Advanced neural networks predict future stock prices with high accuracy and confidence intervals." },
              { icon: icon2, title: "Volatility Modeling", desc: "GARCH models quantify risk and volatility clustering for better risk management decisions." },
              { icon: icon3, title: "Portfolio Optimization", desc: "Maximize Sharpe ratio with AI-driven asset allocation on the efficient frontier." },
              { icon: icon4, title: "Efficient Frontier Visualization", desc: "Interactive charts reveal optimal risk-return trade-offs for your portfolio." },
              { icon: icon5, title: "Risk-Adjusted Metrics", desc: "Comprehensive analytics including Sharpe, Sortino, Beta, Alpha, and Value-at-Risk." },
              { icon: icon6, title: "Real-Time Market Data", desc: "Live quotes, heatmaps, and curated news feed from the Nairobi Securities Exchange." },
            ].map((f) => (
              <article key={f.title} className="rounded-[12px] border border-[#1e283d] bg-[#0f172b] p-6">
                <div className="h-12 w-12 rounded-[12px] bg-[rgba(15,23,43,0.1)] grid place-items-center mb-4">
                  <img src={f.icon} alt="" className="h-6 w-6" />
                </div>
                <h3 className="text-slate-100 text-[24px] leading-[33.6px] font-semibold mb-2">{f.title}</h3>
                <p className="text-[#9398a1] text-[16px] leading-[24px]">{f.desc}</p>
              </article>
            ))}
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

          <div className="space-y-4">
            {[
              { n: "01", t: "Analyze & Forecast", d: "Run LSTM models to predict future stock prices and GARCH models to quantify volatility and risk." },
              { n: "02", t: "Optimize Portfolio", d: "Use AI-driven optimization to find the ideal asset allocation that maximizes your Sharpe ratio." },
              { n: "03", t: "Monitor & Rebalance", d: "Track performance with real-time metrics, alerts, and automated rebalancing recommendations." },
            ].map((s) => (
              <div key={s.n} className="rounded-[12px] border border-[#1e283d] bg-[#0f172b] p-6 flex gap-6 items-center">
                <div className="h-16 w-16 rounded-[12px] grid place-items-center">
                  <span className="text-slate-50 text-[24px] leading-[32px]">{s.n}</span>
                </div>
                <div>
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
        <div className="mx-auto w-full max-w-[1024px] px-4 py-20">
<div className="rounded-[16px] p-12 text-center bg-gradient-to-br from-[#2a2a7e] to-[#2a2a7eCC]">
            <h2 className="text-primary-foreground text-[30px] leading-[39px] font-bold mb-2">
              Ready to Transform Your Investment Strategy?
            </h2>
            <p className="text-primary-foreground/90 text-[16px] leading-[24px] mb-6">
              Join hundreds of investors, analysts, and portfolio managers using AI-powered insights to drive better returns.
            </p>
            <button className="h-14 px-6 rounded-[12px] bg-white text-[#0f172b] text-[16px]">Start Free Trial</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e283d]">
        <div className="mx-auto w-full max-w-[1024px] px-4 h-[89px] flex items-center justify-between">
          <p className="text-[#9398a1] text-[16px] leading-[24px]">© 2024 LSTM-GARCH Platform. All rights reserved.</p>
          <nav className="flex items-center gap-6 text-[#9398a1] text-[14px] leading-[20px]">
            <button>Privacy Policy</button>
            <button>Terms of Service</button>
            <button>Contact</button>
          </nav>
        </div>
      </footer>
    </div>
  );
}