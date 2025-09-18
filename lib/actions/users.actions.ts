"use server";

import { prisma } from "@/db/prisma";
import { Role } from "@prisma/client";
import { signInFormSchema, signUpFormSchema } from "../validators";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { formatError } from "../utils";
import { hashSync } from "bcrypt-ts-edge";
import { Resend } from "resend";
import crypto from "crypto";
import { redirect } from "next/navigation";

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
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
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

    await signIn("credentials", {
      email: user.email,
      password: plainPassword,
    });

    return { success: true, message: "User registered successfully" };
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

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// init mailer (example with Resend, but you can swap for Nodemailer)
const resend = new Resend(process.env.RESEND_API_KEY);

export async function resetPassword(_: unknown, formData: FormData) {
  try {
    const email = formData.get("email") as string;

    if (!email) {
      return { success: false, message: "Email is required" };
    }

    // check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, message: "No account found with this email" };
    }

    const resetToken = crypto.randomBytes(32).toString("base64url");
    const resetTokenExpiry = new Date(Date.now() + RESET_EXPIRY_MS);

    // save token + expiry to user
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // construct reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;

    try {
      const result = await resend.emails.send({
        from: "onboarding@resend.dev", // must be a verified sender domain in Resend
        to: email,
        subject: "Reset your password",
        html: `
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      `,
      });
      console.log(`✅ Reset email sent: ${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      console.error("❌ Failed to send reset password email:", err);
      throw new Error("Email sending failed");
    }
    return {
      success: true,
      message: "A password reset link has been sent to your email.",
    };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
export async function updatePassword(token: string, formData: FormData) {
  try {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
      return { success: false, message: "Both password fields are required." };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match." };
    }

    // find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(), // must not be expired
        },
      },
    });

    if (!user) {
      return { success: false, message: "Invalid or expired reset token." };
    }

    // hash new password
    const hashedPassword = hashSync(password, 10);

    // update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // ✅ redirect after success
    return {
      success: true,
      message: "Your password has been updated successfully. Please sign in.",
      redirectTo: "/sign-in",
    };
  } catch (error) {
    console.error("Error in updatePassword:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
