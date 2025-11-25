"use server";

import { prisma } from "@/db/prisma";
import { Role } from "@prisma/client";
import {
  signInFormSchema,
  signUpFormSchema,
  verify2FASchema,
} from "../validators";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { formatError } from "../utils";
import { hashSync, compareSync } from "bcrypt-ts-edge";
import { Resend } from "resend";
import crypto, { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { twJoin } from "tailwind-merge";

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

// Step 1: Validate credentials and send 2FA code
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData,
) {
  try {
    // Get user input and validate
    const credentials = signInFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !user.password) {
      return { success: false, message: "Invalid email or password" };
    }

    // Verify password
    const isPasswordValid = compareSync(credentials.password, user.password);
    if (!isPasswordValid) {
      return { success: false, message: "Invalid email or password" };
    }

    // If this is the test user, bypass 2FA and sign in directly (only in non-production environments)
    const isDevelopmentOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (process.env.TEST_EMAIL && user.email === process.env.TEST_EMAIL && isDevelopmentOrTest) {
      await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });
      redirect("/dashboard");
    }

    // Generate and send 2FA code
    const code = randomInt(100000, 999999).toString();
    const twoFactorExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorExpiry,
      },
    });

    // Send 2FA code via email
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: user.email,
        subject: "Your Two-Factor Authentication Code",
        html: `
          <h2>Your Login Code</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn\'t request this code, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send 2FA email:", emailError);
      return { success: false, message: "Failed to send verification code" };
    }

    return {
      success: true,
      message: "Verification code sent to your email",
      requiresTwoFactor: true,
      email: user.email,
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.log("Sign-in error:", error);
    return { success: false, message: formatError(error) };
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

    const newUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
      },
    });

    // Sign in the user immediately after registration
    await signIn("credentials", {
      email: newUser.email,
      password: plainPassword,
      redirect: false,
    });

    // Redirect to mandatory passkey setup
    redirect("/setup-passkey");

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

// Step 2: Verify 2FA code and complete sign-in
export async function verifyTwoFactorCode(
  prevState: unknown,
  formData: FormData,
) {
  try {
    // Validate input
    const data = verify2FASchema.parse({
      email: formData.get("email"),
      code: formData.get("code"),
    });

    // Find user and check 2FA code
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        password: true,
        twoFactorCode: true,
        twoFactorExpiry: true,
        authenticators: true,
      },
    });

    if (!user || !user.twoFactorCode || !user.twoFactorExpiry) {
      return {
        success: false,
        message: "No verification code found. Please sign in again.",
      };
    }

    // Check if code is expired
    const now = new Date();
    if (user.twoFactorExpiry < now) {
      return {
        success: false,
        message: "Verification code has expired. Please sign in again.",
      };
    }

    // Verify the code
    if (user.twoFactorCode !== data.code) {
      return { success: false, message: "Invalid verification code." };
    }

    // Mark 2FA as verified and clear the code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpiry: null,
        twoFactorVerifiedAt: new Date(),
      },
    });

    // Get user role to determine redirect
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    // For INVESTOR users, redirect directly to dashboard
    // For other roles, check passkey status
    const redirectTo = fullUser?.role === "INVESTOR" 
      ? "/dashboard"
      : (user.authenticators && user.authenticators.length > 0) 
        ? "/verify-passkey" 
        : "/setup-passkey";

    // Sign in the user with 2FA bypass and redirect
    await signIn("credentials", {
      email: user.email,
      password: `2FA_VERIFIED:${user.id}`,
      redirectTo,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("2FA verification error:", error);
    return { success: false, message: formatError(error) };
  }
}

// Resend 2FA code (for users who didn't receive it)
export async function resend2FACode(email: string) {
  try {
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Generate a new 6-digit code
    const code = randomInt(100000, 999999).toString();

    // Save code + expiry (5 minutes from now)
    await prisma.user.update({
      where: { email },
      data: {
        twoFactorCode: code,
        twoFactorExpiry: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Send via Resend
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Your Two-Factor Authentication Code",
        html: `
          <h2>Your Login Code</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to resend 2FA email:", emailError);
      return { success: false, message: "Failed to send verification code" };
    }

    return { success: true, message: "Verification code resent to your email" };
  } catch (error) {
    console.error("resend2FACode error:", error);
    return { success: false, message: "Failed to resend code" };
  }
}
