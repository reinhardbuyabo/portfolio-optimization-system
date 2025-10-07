import { auth } from "@/auth";
import { Role } from "@prisma/client";

/**
 * Role hierarchy for permission checks
 * Higher index = more permissions
 */
const ROLE_HIERARCHY: Role[] = [
  Role.INVESTOR,
  Role.ANALYST,
  Role.PORTFOLIO_MANAGER,
  Role.ADMIN,
];

/**
 * Check if a role has at least the required permission level
 */
export function hasRolePermission(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Server-side: Get current user session with role
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

/**
 * Server-side: Check if user has required role
 */
export async function requireRole(requiredRole: Role): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return hasRolePermission(user.role, requiredRole);
}

/**
 * Server-side: Require authentication and return user or throw
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }
  return user;
}

/**
 * Server-side: Require specific role or throw
 */
export async function requireRoleOrThrow(requiredRole: Role) {
  const user = await requireAuth();
  if (!hasRolePermission(user.role, requiredRole)) {
    throw new Error(
      `Unauthorized: ${requiredRole} role or higher required. Current role: ${user.role}`
    );
  }
  return user;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    [Role.ADMIN]: "Administrator",
    [Role.PORTFOLIO_MANAGER]: "Portfolio Manager",
    [Role.ANALYST]: "Analyst",
    [Role.INVESTOR]: "Investor",
  };
  return roleNames[role];
}

/**
 * Get role color for UI (TailwindCSS classes)
 */
export function getRoleColor(role: Role): string {
  const roleColors: Record<Role, string> = {
    [Role.ADMIN]: "text-red-600 bg-red-50 border-red-200",
    [Role.PORTFOLIO_MANAGER]: "text-purple-600 bg-purple-50 border-purple-200",
    [Role.ANALYST]: "text-blue-600 bg-blue-50 border-blue-200",
    [Role.INVESTOR]: "text-green-600 bg-green-50 border-green-200",
  };
  return roleColors[role];
}
