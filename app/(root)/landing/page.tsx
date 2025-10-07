import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NSEMarketOverview } from "@/components/shared/nse-market-overview";
import { TradingViewChart } from "@/components/shared/tradingview-chart";
import Link from "next/link";

/**
 * Public landing page with NSE market data
 * Unauthenticated users can view market data but need to sign up for features
 */
export default async function LandingPage() {
  const session = await auth();

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Portfolio Optimization System
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Optimize your investment portfolio with AI-powered insights from the
            Nairobi Securities Exchange
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition border-2 border-white"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* NSE Market Overview */}
      <section className="container mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Nairobi Securities Exchange - Live Market Data
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          Track the performance of top NSE stocks in real-time
        </p>
        <div className="bg-card rounded-lg shadow-lg p-6">
          <NSEMarketOverview height={450} />
        </div>
      </section>

      {/* Featured Chart - Safaricom */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Featured Stock: Safaricom PLC
          </h2>
          <div className="bg-card rounded-lg shadow-lg p-6">
            <TradingViewChart symbol="NSE:SCOM" height={500} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Why Choose Our Platform?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="📊"
            title="Portfolio Optimization"
            description="Use advanced algorithms to optimize your portfolio allocation based on your risk tolerance and investment goals."
          />
          <FeatureCard
            icon="📈"
            title="Real-Time Market Data"
            description="Access live market data from the Nairobi Securities Exchange to make informed investment decisions."
          />
          <FeatureCard
            icon="🔒"
            title="Secure & Private"
            description="Your data is protected with enterprise-grade security including two-factor authentication and passkeys."
          />
          <FeatureCard
            icon="🎯"
            title="Risk Analysis"
            description="Comprehensive risk metrics including Sharpe ratio, Sortino ratio, and maximum drawdown analysis."
          />
          <FeatureCard
            icon="🤖"
            title="AI-Powered Insights"
            description="Leverage machine learning algorithms to discover investment opportunities and optimize returns."
          />
          <FeatureCard
            icon="📱"
            title="Mobile Friendly"
            description="Access your portfolio and market data anywhere, anytime from any device."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Optimize Your Portfolio?
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            Join thousands of investors using our platform to maximize returns
          </p>
          <Link
            href="/sign-up"
            className="bg-white text-purple-600 px-10 py-4 rounded-lg font-semibold text-lg hover:bg-purple-50 transition inline-block"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Access Restricted Notice */}
      <section className="container mx-auto px-6 py-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-yellow-900 mb-2">
            🔒 Premium Features Require Account
          </p>
          <p className="text-yellow-800">
            To access portfolio optimization, backtesting, and personalized
            recommendations,{" "}
            <Link href="/sign-up" className="underline font-semibold">
              create a free account
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-md hover:shadow-lg transition">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
