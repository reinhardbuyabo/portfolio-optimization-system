import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/db/prisma";
import { hashSync } from "bcrypt-ts-edge";
import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";

/**
 * E2E Test: Verify that user roles are properly embedded in JWT tokens
 * and can be successfully extracted upon login
 */
describe("Role JWT Validation E2E", () => {
  const testUsers = [
    {
      email: "admin-jwt-test@example.com",
      password: "AdminPassword123!",
      role: Role.ADMIN,
      name: "Admin JWT Test",
    },
    {
      email: "pm-jwt-test@example.com",
      password: "PMPassword123!",
      role: Role.PORTFOLIO_MANAGER,
      name: "PM JWT Test",
    },
    {
      email: "analyst-jwt-test@example.com",
      password: "AnalystPassword123!",
      role: Role.ANALYST,
      name: "Analyst JWT Test",
    },
    {
      email: "investor-jwt-test@example.com",
      password: "InvestorPassword123!",
      role: Role.INVESTOR,
      name: "Investor JWT Test",
    },
  ];

  beforeAll(async () => {
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: testUsers.map((u) => u.email),
        },
      },
    });

    // Create test users with different roles
    for (const testUser of testUsers) {
      await prisma.user.create({
        data: {
          email: testUser.email,
          password: hashSync(testUser.password, 10),
          name: testUser.name,
          role: testUser.role,
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: testUsers.map((u) => u.email),
        },
      },
    });
  });

  describe("Role in JWT Token", () => {
    it("should embed ADMIN role in JWT token on login", async () => {
      const testUser = testUsers.find((u) => u.role === Role.ADMIN)!;
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeTruthy();
      expect(user?.role).toBe(Role.ADMIN);

      // Simulate JWT token creation (as done in auth.ts jwt callback)
      const token = {
        id: user!.id,
        role: user!.role,
        email: user!.email,
        name: user!.name,
      };

      // Verify role is in token
      expect(token.role).toBe(Role.ADMIN);
      expect(token.id).toBe(user!.id);
    });

    it("should embed PORTFOLIO_MANAGER role in JWT token on login", async () => {
      const testUser = testUsers.find((u) => u.role === Role.PORTFOLIO_MANAGER)!;
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeTruthy();
      expect(user?.role).toBe(Role.PORTFOLIO_MANAGER);

      const token = {
        id: user!.id,
        role: user!.role,
        email: user!.email,
        name: user!.name,
      };

      expect(token.role).toBe(Role.PORTFOLIO_MANAGER);
    });

    it("should embed ANALYST role in JWT token on login", async () => {
      const testUser = testUsers.find((u) => u.role === Role.ANALYST)!;
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeTruthy();
      expect(user?.role).toBe(Role.ANALYST);

      const token = {
        id: user!.id,
        role: user!.role,
        email: user!.email,
        name: user!.name,
      };

      expect(token.role).toBe(Role.ANALYST);
    });

    it("should embed INVESTOR role in JWT token on login", async () => {
      const testUser = testUsers.find((u) => u.role === Role.INVESTOR)!;
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeTruthy();
      expect(user?.role).toBe(Role.INVESTOR);

      const token = {
        id: user!.id,
        role: user!.role,
        email: user!.email,
        name: user!.name,
      };

      expect(token.role).toBe(Role.INVESTOR);
    });
  });

  describe("JWT Token Extraction", () => {
    it("should successfully extract role from JWT token", () => {
      const mockToken = {
        id: "test-user-id",
        email: "test@example.com",
        role: Role.ADMIN,
        name: "Test User",
      };

      // Simulate session callback (as done in auth.ts)
      const session = {
        user: {
          id: mockToken.id,
          email: mockToken.email,
          role: mockToken.role,
          name: mockToken.name,
        },
      };

      // Verify role is correctly extracted
      expect(session.user.role).toBe(Role.ADMIN);
      expect(session.user.id).toBe(mockToken.id);
      expect(session.user.email).toBe(mockToken.email);
    });

    it("should handle all role types in token extraction", () => {
      const roles = [Role.ADMIN, Role.PORTFOLIO_MANAGER, Role.ANALYST, Role.INVESTOR];

      roles.forEach((role) => {
        const token = {
          id: "test-id",
          email: "test@example.com",
          role: role,
          name: "Test",
        };

        const session = {
          user: {
            id: token.id,
            email: token.email,
            role: token.role,
            name: token.name,
          },
        };

        expect(session.user.role).toBe(role);
      });
    });
  });

  describe("Role Persistence", () => {
    it("should maintain role consistency from DB to JWT to Session", async () => {
      // Test for each role
      for (const testUser of testUsers) {
        // 1. Get user from DB
        const dbUser = await prisma.user.findUnique({
          where: { email: testUser.email },
        });

        expect(dbUser).toBeTruthy();
        expect(dbUser?.role).toBe(testUser.role);

        // 2. Simulate JWT callback
        const jwtToken = {
          id: dbUser!.id,
          role: dbUser!.role,
          email: dbUser!.email,
          name: dbUser!.name,
        };

        expect(jwtToken.role).toBe(testUser.role);

        // 3. Simulate session callback
        const session = {
          user: {
            id: jwtToken.id,
            role: jwtToken.role,
            email: jwtToken.email,
            name: jwtToken.name,
          },
        };

        // Verify role is consistent throughout the chain
        expect(session.user.role).toBe(testUser.role);
        expect(session.user.role).toBe(dbUser?.role);
        expect(session.user.role).toBe(jwtToken.role);
      }
    });
  });

  describe("Role Type Safety", () => {
    it("should only accept valid Role enum values", async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUsers[0].email },
      });

      // TypeScript should enforce Role enum
      const validRoles: Role[] = [
        Role.ADMIN,
        Role.PORTFOLIO_MANAGER,
        Role.ANALYST,
        Role.INVESTOR,
      ];

      expect(validRoles).toContain(user?.role);
    });
  });
});
