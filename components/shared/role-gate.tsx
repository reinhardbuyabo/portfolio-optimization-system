"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { hasRolePermission } from "@/lib/auth-utils";
import { ReactNode } from "react";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: Role[];
  fallback?: ReactNode;
}

/**
 * Client-side component to conditionally render content based on user role
 */
export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { data: session } = useSession();

  if (!session?.user) {
    return <>{fallback}</>;
  }

  const hasPermission = allowedRoles.some((role) =>
    hasRolePermission(session.user.role, role)
  );

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
