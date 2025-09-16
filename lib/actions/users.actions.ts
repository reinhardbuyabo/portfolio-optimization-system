"use server";

import { prisma } from "@/db/prisma";
import { Role } from "@prisma/client";

// Fetch all users
export async function getUsers() {
  return prisma.user.findMany({
    include: {
      investorProfile: true,
      portfolios: true,
    },
  });
}

// Fetch a single user by ID
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      investorProfile: true,
      portfolios: true,
    },
  });
}

// Create a new user
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: Role; // use Prisma enum
}) {
  return prisma.user.create({ data });
}
