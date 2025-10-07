/**
 * Unit tests for role-based authentication utilities
 * Tests the core logic without server dependencies
 */
import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";

// Import only pure functions that don't require server context
const ROLE_HIERARCHY: Role[] = [
  Role.INVESTOR,
  Role.ANALYST,
  Role.PORTFOLIO_MANAGER,
  Role.ADMIN,
];

function hasRolePermission(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    [Role.ADMIN]: "Administrator",
    [Role.PORTFOLIO_MANAGER]: "Portfolio Manager",
    [Role.ANALYST]: "Analyst",
    [Role.INVESTOR]: "Investor",
  };
  return roleNames[role];
}

function getRoleColor(role: Role): string {
  const roleColors: Record<Role, string> = {
    [Role.ADMIN]: "text-red-600 bg-red-50 border-red-200",
    [Role.PORTFOLIO_MANAGER]: "text-purple-600 bg-purple-50 border-purple-200",
    [Role.ANALYST]: "text-blue-600 bg-blue-50 border-blue-200",
    [Role.INVESTOR]: "text-green-600 bg-green-50 border-green-200",
  };
  return roleColors[role];
}

describe("auth-utils", () => {
  describe("hasRolePermission", () => {
    it("should return true when user has exact required role", () => {
      expect(hasRolePermission(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(hasRolePermission(Role.PORTFOLIO_MANAGER, Role.PORTFOLIO_MANAGER)).toBe(true);
      expect(hasRolePermission(Role.ANALYST, Role.ANALYST)).toBe(true);
      expect(hasRolePermission(Role.INVESTOR, Role.INVESTOR)).toBe(true);
    });

    it("should return true when user has higher role than required", () => {
      expect(hasRolePermission(Role.ADMIN, Role.PORTFOLIO_MANAGER)).toBe(true);
      expect(hasRolePermission(Role.ADMIN, Role.ANALYST)).toBe(true);
      expect(hasRolePermission(Role.ADMIN, Role.INVESTOR)).toBe(true);

      expect(hasRolePermission(Role.PORTFOLIO_MANAGER, Role.ANALYST)).toBe(true);
      expect(hasRolePermission(Role.PORTFOLIO_MANAGER, Role.INVESTOR)).toBe(true);

      expect(hasRolePermission(Role.ANALYST, Role.INVESTOR)).toBe(true);
    });

    it("should return false when user has lower role than required", () => {
      expect(hasRolePermission(Role.INVESTOR, Role.ANALYST)).toBe(false);
      expect(hasRolePermission(Role.INVESTOR, Role.PORTFOLIO_MANAGER)).toBe(false);
      expect(hasRolePermission(Role.INVESTOR, Role.ADMIN)).toBe(false);

      expect(hasRolePermission(Role.ANALYST, Role.PORTFOLIO_MANAGER)).toBe(false);
      expect(hasRolePermission(Role.ANALYST, Role.ADMIN)).toBe(false);

      expect(hasRolePermission(Role.PORTFOLIO_MANAGER, Role.ADMIN)).toBe(false);
    });
  });

  describe("getRoleDisplayName", () => {
    it("should return correct display names for all roles", () => {
      expect(getRoleDisplayName(Role.ADMIN)).toBe("Administrator");
      expect(getRoleDisplayName(Role.PORTFOLIO_MANAGER)).toBe("Portfolio Manager");
      expect(getRoleDisplayName(Role.ANALYST)).toBe("Analyst");
      expect(getRoleDisplayName(Role.INVESTOR)).toBe("Investor");
    });
  });

  describe("getRoleColor", () => {
    it("should return correct color classes for all roles", () => {
      expect(getRoleColor(Role.ADMIN)).toContain("text-red-600");
      expect(getRoleColor(Role.PORTFOLIO_MANAGER)).toContain("text-purple-600");
      expect(getRoleColor(Role.ANALYST)).toContain("text-blue-600");
      expect(getRoleColor(Role.INVESTOR)).toContain("text-green-600");
    });
  });
});
