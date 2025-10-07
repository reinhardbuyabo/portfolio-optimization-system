import { auth } from "@/auth";
import { hasRolePermission } from "@/lib/auth-utils";
import { Role } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { RoleBadge } from "@/components/shared/role-badge";
import { UnauthorizedAccess } from "@/components/shared/unauthorized-access";
import { AuthRequired } from "@/components/shared/auth-required";

/**
 * Admin-only page - Protected by role check
 */
export default async function AdminPage() {
  const session = await auth();

  // Check authentication
  if (!session?.user) {
    return <AuthRequired message="You must sign in to access the admin panel." />;
  }

  // Check authorization
  if (!hasRolePermission(session.user.role, Role.ADMIN)) {
    return (
      <UnauthorizedAccess
        requiredRole={Role.ADMIN}
        userRole={session.user.role}
        message="Only administrators can access this page."
      />
    );
  }

  const user = session.user;

  // Fetch system statistics
  const stats = await getSystemStats();

  return (
    <main className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <RoleBadge role={user.role} />
      </div>

      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900">
        <p className="font-semibold">🔒 Admin Only Area</p>
        <p className="text-sm">This page is only accessible to administrators.</p>
      </div>

      {/* System Statistics */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">System Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            icon="👥"
            color="blue"
          />
          <StatCard
            label="Total Portfolios"
            value={stats.totalPortfolios}
            icon="💼"
            color="purple"
          />
          <StatCard
            label="Total Assets"
            value={stats.totalAssets}
            icon="📈"
            color="green"
          />
          <StatCard
            label="Active Sessions"
            value={stats.activeSessions}
            icon="🔓"
            color="orange"
          />
        </div>
      </section>

      {/* User Breakdown by Role */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Users by Role</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RoleStatCard
            role={Role.ADMIN}
            count={stats.usersByRole.ADMIN}
          />
          <RoleStatCard
            role={Role.PORTFOLIO_MANAGER}
            count={stats.usersByRole.PORTFOLIO_MANAGER}
          />
          <RoleStatCard
            role={Role.ANALYST}
            count={stats.usersByRole.ANALYST}
          />
          <RoleStatCard
            role={Role.INVESTOR}
            count={stats.usersByRole.INVESTOR}
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">System Overview</h2>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Full admin functionality can be implemented here, including:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
            <li>User management (create, edit, delete users)</li>
            <li>Role assignment and permissions</li>
            <li>System configuration</li>
            <li>Audit logs and activity monitoring</li>
            <li>Data backups and exports</li>
            <li>Platform-wide analytics</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

async function getSystemStats() {
  const [totalUsers, totalPortfolios, totalAssets, activeSessions] =
    await Promise.all([
      prisma.user.count(),
      prisma.portfolio.count(),
      prisma.asset.count(),
      prisma.session.count(),
    ]);

  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });

  const roleBreakdown = {
    ADMIN: 0,
    PORTFOLIO_MANAGER: 0,
    ANALYST: 0,
    INVESTOR: 0,
  };

  usersByRole.forEach((group) => {
    roleBreakdown[group.role] = group._count;
  });

  return {
    totalUsers,
    totalPortfolios,
    totalAssets,
    activeSessions,
    usersByRole: roleBreakdown,
  };
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: "blue" | "purple" | "green" | "orange";
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    green: "bg-green-50 border-green-200 text-green-900",
    orange: "bg-orange-50 border-orange-200 text-orange-900",
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

interface RoleStatCardProps {
  role: Role;
  count: number;
}

function RoleStatCard({ role, count }: RoleStatCardProps) {
  return (
    <div className="p-6 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-3">
        <RoleBadge role={role} />
      </div>
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-sm text-muted-foreground mt-1">users</p>
    </div>
  );
}
