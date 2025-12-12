"use client";

import { useRole } from "@/hooks/use-role";
import { RoleGate } from "./role-gate";
import { RoleBadge } from "./role-badge";
import { Role } from "@prisma/client";

/**
 * Demo component showing role-based UI rendering
 * This demonstrates how to use the useRole hook and RoleGate component
 */
export function RoleUIDemo() {
  const {
    role,
    isLoading,
    isAuthenticated,
    hasRole,
    isAdmin,
    isPortfolioManager,
    isAnalyst,
    isInvestor,
  } = useRole();

  if (isLoading) {
    return <div className="p-4 text-center">Loading role information...</div>;
  }

  if (!isAuthenticated || !role) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
        <p className="text-yellow-900">Not authenticated</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Role Info */}
      <section className="p-6 rounded-lg border bg-card">
        <h3 className="text-lg font-semibold mb-3">Your Current Role</h3>
        <div className="flex items-center gap-3">
          <RoleBadge role={role} />
          <div className="text-sm text-muted-foreground">
            <p>Admin: {isAdmin ? "✅" : "❌"}</p>
            <p>Portfolio Manager: {isPortfolioManager ? "✅" : "❌"}</p>
            <p>Analyst: {isAnalyst ? "✅" : "❌"}</p>
            <p>Investor: {isInvestor ? "✅" : "❌"}</p>
          </div>
        </div>
      </section>

      {/* Role-specific content using RoleGate */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Role-Based Content</h3>

        {/* Admin-only content */}
        <RoleGate
          allowedRoles={[Role.ADMIN]}
          fallback={
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                🔒 Admin-only content (hidden from you)
              </p>
            </div>
          }
        >
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="font-semibold text-red-900">👑 Admin Content</p>
            <p className="text-sm text-red-800">
              This content is only visible to administrators.
            </p>
          </div>
        </RoleGate>

        {/* Portfolio Manager and above */}
        <RoleGate
          allowedRoles={[Role.PORTFOLIO_MANAGER]}
          fallback={
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                🔒 Portfolio Manager content (hidden from you)
              </p>
            </div>
          }
        >
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <p className="font-semibold text-purple-900">
              💼 Portfolio Manager Content
            </p>
            <p className="text-sm text-purple-800">
              This content is visible to Portfolio Managers and Admins.
            </p>
          </div>
        </RoleGate>

        {/* Analyst and above */}
        <RoleGate
          allowedRoles={[Role.ANALYST]}
          fallback={
            <div className="p-4 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                🔒 Analyst content (hidden from you)
              </p>
            </div>
          }
        >
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="font-semibold text-blue-900">📊 Analyst Content</p>
            <p className="text-sm text-blue-800">
              This content is visible to Analysts, Portfolio Managers, and Admins.
            </p>
          </div>
        </RoleGate>

        {/* All authenticated users */}
        <RoleGate
          allowedRoles={[Role.INVESTOR]}
          fallback={<p className="text-sm text-muted-foreground">Not authenticated</p>}
        >
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="font-semibold text-green-900">🌟 All Users Content</p>
            <p className="text-sm text-green-800">
              This content is visible to all authenticated users.
            </p>
          </div>
        </RoleGate>
      </section>

      {/* Permission Checks */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Permission Checks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PermissionCard
            label="Can access admin panel"
            hasPermission={hasRole(Role.ADMIN)}
          />
          <PermissionCard
            label="Can manage portfolios"
            hasPermission={hasRole(Role.PORTFOLIO_MANAGER)}
          />
          <PermissionCard
            label="Can run analytics"
            hasPermission={hasRole(Role.ANALYST)}
          />
          <PermissionCard
            label="Can view own portfolio"
            hasPermission={hasRole(Role.INVESTOR)}
          />
        </div>
      </section>
    </div>
  );
}

interface PermissionCardProps {
  label: string;
  hasPermission: boolean;
}

function PermissionCard({ label, hasPermission }: PermissionCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        hasPermission
          ? "bg-green-50 border-green-200"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xl">{hasPermission ? "✅" : "❌"}</span>
      </div>
    </div>
  );
}
