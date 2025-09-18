"use server";

import { prisma } from "@/db/prisma";
import { Role } from "@prisma/client";
import { signInFormSchema } from "../validators";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

// Fetch all users with related info
export async function getUsers() {
    const users = await prisma.user.findMany({
        include: {
            investorProfile: true,
            portfolios: {
                include: {
                    allocations: {
                        include: {
                            asset: true,
                        },
                    },
                    results: true,
                },
            },
        },
    });

    return users;
}

// Fetch a single user by ID
export async function getUserById(id: string) {
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            investorProfile: true,
            portfolios: {
                include: {
                    allocations: {
                        include: {
                            asset: true,
                        },
                    },
                    results: true,
                },
            },
        },
    });

    return user;
}

// Create a new user
export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
}) {
    return prisma.user.create({
        data,
    });
}

// Sign in the user with credentials
export async function signInWithCredentials(
    prevState: unknown,
    formData: FormData,
) {
    try {
        const user = signInFormSchema.parse({
            email: formData.get("email"),
            password: formData.get("password"),
        });

        await signIn("credentials", user);

        return {
            success: true,
            message: "Signed in successfully",
        };
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }

        return { success: false, message: "Invalid email or password" };
    }
}

export async function signOutUser() {
    await signOut();
}
