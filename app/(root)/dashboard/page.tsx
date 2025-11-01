import { auth } from "@/auth";
import { RoleBadge } from "@/components/shared/role-badge";
import { Role } from "@prisma/client";
import { AuthRequired } from "@/components/shared/auth-required";
import Link from "next/link";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: string;
}

function DashboardCard({ title, description, icon }: DashboardCardProps) {
  return (
    <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CreatePortfolioCard() {
  return (
    <Link href="/dashboard/portfolios/create">
      <DashboardCard
        title="Create Portfolio"
        description="Create a new investment portfolio"
        icon="+"
      />
    </Link>
  );
}

/**
 * Role-based Dashboard - Shows different content based on user role
 */
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return <AuthRequired message="Sign in to access your personalized dashboard." />;
  }

  const { user } = session;

  return (
    <main className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <RoleBadge role={user.role} />
      </div>

      {/* User Info */}
      <section className="p-6 rounded-lg border bg-card">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user.name}</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-medium">Role:</span> {user.role}
          </p>
          <p>
            <span className="font-medium">User ID:</span> {user.id}
          </p>
        </div>
      </section>

      {/* Role-specific content */}
      {user.role === Role.ADMIN && <AdminDashboard />}
      {user.role === Role.PORTFOLIO_MANAGER && <PortfolioManagerDashboard />}
      {user.role === Role.ANALYST && <AnalystDashboard />}
      {user.role === Role.INVESTOR && <InvestorDashboard />}
    </main>
  );
}

function AdminDashboard() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-red-600">Administrator Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="User Management"
          description="Manage all users and their roles"
          icon="👥"
        />
        <DashboardCard
          title="System Settings"
          description="Configure system-wide settings"
          icon="⚙️"
        />
        <DashboardCard
          title="Analytics"
          description="View system analytics and reports"
          icon="📊"
        />
        <DashboardCard
          title="Portfolio Oversight"
          description="Monitor all portfolios across the system"
          icon="💼"
        />
        <DashboardCard
          title="Asset Management"
          description="Add, edit, or remove assets"
          icon="📈"
        />
        <DashboardCard
          title="Audit Logs"
          description="Review system audit logs"
          icon="📝"
        />
      </div>
    </section>
  );
}

function PortfolioManagerDashboard() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-purple-600">
        Portfolio Manager Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CreatePortfolioCard />
        <DashboardCard
          title="My Portfolios"
          description="Manage and optimize portfolios"
          icon="💼"
        />
        <DashboardCard
          title="Client Portfolios"
          description="View and manage client portfolios"
          icon="👥"
        />
        <DashboardCard
          title="Optimization Tools"
          description="Run portfolio optimization algorithms"
          icon="🔧"
        />
        <DashboardCard
          title="Performance Reports"
          description="Generate portfolio performance reports"
          icon="📊"
        />
        <DashboardCard
          title="Risk Analysis"
          description="Analyze portfolio risk metrics"
          icon="⚠️"
        />
        <DashboardCard
          title="Market Data"
          description="Access real-time market data"
          icon="📈"
        />
      </div>
    </section>
  );
}

function AnalystDashboard() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-blue-600">Analyst Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Market Analysis"
          description="Analyze market trends and patterns"
          icon="📊"
        />
        <DashboardCard
          title="Asset Research"
          description="Research and analyze individual assets"
          icon="🔍"
        />
        <DashboardCard
          title="Portfolio Analytics"
          description="Analyze portfolio performance metrics"
          icon="📈"
        />
        <DashboardCard
          title="Reports"
          description="Generate analytical reports"
          icon="📝"
        />
        <DashboardCard
          title="Data Visualization"
          description="Create charts and visualizations"
          icon="📉"
        />
        <DashboardCard
          title="Backtesting"
          description="Run backtests on strategies"
          icon="⏮️"
        />
      </div>
    </section>
  );
}

function InvestorDashboard() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-green-600">Investor Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CreatePortfolioCard />
        <DashboardCard
          title="My Portfolio"
          description="View your investment portfolio"
          icon="💼"
        />
        <DashboardCard
          title="Performance"
          description="Track your portfolio performance"
          icon="📈"
        />
        <DashboardCard
          title="Risk Profile"
          description="View and update your risk profile"
          icon="⚖️"
        />
        <DashboardCard
          title="Investment Goals"
          description="Set and track investment goals"
          icon="🎯"
        />
        <DashboardCard
          title="Market Insights"
          description="Read market insights and analysis"
          icon="💡"
        />
        <DashboardCard
          title="Account Settings"
          description="Manage your account preferences"
          icon="⚙️"
        />
      </div>
    </section>
  );
}