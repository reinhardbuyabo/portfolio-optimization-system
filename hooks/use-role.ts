"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { hasRolePermission } from "@/lib/auth-utils";

/**
 * Client-side hook to access user role and check permissions
 */
export function useRole() {
  const { data: session, status } = useSession();

  return {
    role: session?.user?.role,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    hasRole: (requiredRole: Role) => {
      if (!session?.user?.role) return false;
      return hasRolePermission(session.user.role, requiredRole);
    },
    isAdmin: session?.user?.role === Role.ADMIN,
    isPortfolioManager: session?.user?.role === Role.PORTFOLIO_MANAGER,
    isAnalyst: session?.user?.role === Role.ANALYST,
    isInvestor: session?.user?.role === Role.INVESTOR,
  };
}
