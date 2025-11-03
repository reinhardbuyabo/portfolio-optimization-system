"use server";

import { z } from "zod";
import { createPortfolioSchema } from "@/lib/validators";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { formatError } from "../utils";

type PortfolioFormState = {
  message: string;
  success?: boolean; // Add success flag
  fields?: Record<string, string>;
  issues?: string[];
};

export async function createPortfolio(
  state: PortfolioFormState,
  data: FormData,
): Promise<PortfolioFormState> {
  try {
    const formData = Object.fromEntries(data);
    const parsed = createPortfolioSchema.parse({
      ...formData,
      targetReturn: Number(formData.targetReturn),
    });

    const session = await auth();

    if (!session?.user) {
      return {
        message: "Unauthorized: You must be logged in to create a portfolio.",
        success: false,
      };
    }

    const { id: userId, role } = session.user;

    if (role !== "INVESTOR" && role !== "PORTFOLIO_MANAGER") {
      return {
        message: "Forbidden: You do not have permission to create a portfolio.",
        success: false,
      };
    }

    const { name, riskTolerance, targetReturn } = parsed;

    const existingPortfolio = await prisma.portfolio.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (existingPortfolio) {
      return {
        message: "A portfolio with this name already exists.",
        success: false,
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
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      message: formatError(error),
      success: false,
    };
  }
}