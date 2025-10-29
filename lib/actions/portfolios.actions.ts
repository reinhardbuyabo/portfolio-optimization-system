"use server";

import { z } from "zod";
import { createPortfolioSchema } from "@/lib/validators";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

type PortfolioFormState = {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
};

export async function createPortfolio(
  state: PortfolioFormState,
  data: FormData,
): Promise<PortfolioFormState> {
  const formData = Object.fromEntries(data);
  const parsed = createPortfolioSchema.safeParse({
    ...formData,
    targetReturn: Number(formData.targetReturn),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message);
    return {
      message: "Invalid form data",
      issues,
    };
  }

  const session = await auth();

  if (!session?.user) {
    return {
      message: "Unauthorized: You must be logged in to create a portfolio.",
    };
  }

  const { id: userId, role } = session.user;

  if (role !== "INVESTOR" && role !== "PORTFOLIO_MANAGER") {
    return {
      message: "Forbidden: You do not have permission to create a portfolio.",
    };
  }

  const { name, riskTolerance, targetReturn } = parsed.data;

  try {
    const existingPortfolio = await prisma.portfolio.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (existingPortfolio) {
      return {
        message: "A portfolio with this name already exists.",
      };
    }

    await prisma.portfolio.create({
      data: {
        userId,
        name,
        riskTolerance,
        targetReturn,
      },
    });

    revalidatePath("/dashboard/portfolios");

    return {
      message: "Portfolio created successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      message: "An unexpected error occurred. Please try again.",
    };
  }
}