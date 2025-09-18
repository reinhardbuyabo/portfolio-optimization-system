"use server";

import { prisma } from "@/db/prisma";
import { Role } from "@prisma/client";
import { signInFormSchema, signUpFormSchema } from "../validators";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { formatError } from "../utils";
import { hashSync } from "bcrypt-ts-edge";

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

        // Debugging log to check user credentials
        console.log("Signing in with:", user);

        const result = await signIn("credentials", user);
        if (!result) {
          return { success: false, message: "Sign in failed" };
        }

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

// Sign up user
export async function signUpUser(prevState: unknown, formData: FormData) {
  try {
    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const plainPassword = user.password;

    user.password = hashSync(user.password, 10);

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
      },
    });

    await signIn('credentials', {
      email: user.email,
      password: plainPassword,
    });

    return { success: true, message: 'User registered successfully' };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error) };
  }
}

export async function signOutUser() {
    await signOut();
}
