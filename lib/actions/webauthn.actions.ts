"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { signIn } from "@/auth";

// WebAuthn Configuration
const rpName = process.env.NEXT_PUBLIC_RP_NAME || "Portfolio Optimization System";
const rpID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const origin = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || "http://localhost:3000";

/**
 * Generate registration options for creating a new passkey
 * User must be authenticated to register a passkey
 */
export async function generatePasskeyRegistrationOptions() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return { success: false, message: "You must be signed in to register a passkey" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        authenticators: true,
      },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      userDisplayName: user.name || user.email,
      // Don't prompt users for additional information about the authenticator
      attestationType: "none",
      // Prevent users from re-registering existing authenticators
      excludeCredentials: user.authenticators.map((authenticator) => ({
        id: Buffer.from(authenticator.credentialID, "base64url"),
        type: "public-key",
        transports: authenticator.transports?.split(",") as AuthenticatorTransport[] | undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };

    const options = await generateRegistrationOptions(opts);

    // Store the challenge for verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        webauthnChallenge: options.challenge,
        challengeExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    return {
      success: true,
      options,
    };
  } catch (error) {
    console.error("Error generating registration options:", error);
    return {
      success: false,
      message: "Failed to generate registration options",
    };
  }
}

/**
 * Verify and store a new passkey registration
 */
export async function verifyPasskeyRegistration(response: RegistrationResponseJSON) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return { success: false, message: "You must be signed in" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.webauthnChallenge) {
      return { success: false, message: "Registration session expired" };
    }

    const expectedChallenge = user.webauthnChallenge;

    const opts: VerifyRegistrationResponseOpts = {
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    };

    const verification = await verifyRegistrationResponse(opts);

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, message: "Verification failed" };
    }

    const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    // Store the authenticator
    await prisma.authenticator.create({
      data: {
        userId: user.id,
        credentialID: Buffer.from(credentialID).toString("base64url"),
        providerAccountId: Buffer.from(credentialID).toString("base64url"),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64url"),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: response.response.transports?.join(","),
      },
    });

    // Clear the challenge
    await prisma.user.update({
      where: { id: user.id },
      data: {
        webauthnChallenge: null,
        challengeExpiry: null,
      },
    });

    return {
      success: true,
      message: "Passkey registered successfully",
    };
  } catch (error) {
    console.error("Error verifying registration:", error);
    return {
      success: false,
      message: "Failed to verify registration",
    };
  }
}

/**
 * Generate authentication options for signing in with a passkey
 */
export async function generatePasskeyAuthenticationOptions(email?: string) {
  try {
    let userAuthenticators: any[] = [];

    if (email) {
      // Get user's authenticators if email provided
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          authenticators: true,
        },
      });

      if (user) {
        userAuthenticators = user.authenticators;
      }
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      rpID,
      // Allow any authenticator if no email provided (discoverable credential)
      allowCredentials: userAuthenticators.map((authenticator) => ({
        id: Buffer.from(authenticator.credentialID, "base64url"),
        type: "public-key",
        transports: authenticator.transports?.split(",") as AuthenticatorTransport[] | undefined,
      })),
      userVerification: "preferred",
    };

    const options = await generateAuthenticationOptions(opts);

    // Store challenge in memory or session (simplified approach using database)
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            webauthnChallenge: options.challenge,
            challengeExpiry: new Date(Date.now() + 5 * 60 * 1000),
          },
        });
      }
    }

    return {
      success: true,
      options,
      challenge: options.challenge,
    };
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return {
      success: false,
      message: "Failed to generate authentication options",
    };
  }
}

/**
 * Verify passkey authentication and sign in the user
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  challenge: string
) {
  try {
    // Find the authenticator by credential ID
    const credentialID = Buffer.from(response.id, "base64url").toString("base64url");

    const authenticator = await prisma.authenticator.findUnique({
      where: { credentialID },
      include: { user: true },
    });

    if (!authenticator) {
      return { success: false, message: "Passkey not found" };
    }

    const user = authenticator.user;

    // Verify the challenge matches
    if (user.webauthnChallenge !== challenge) {
      return { success: false, message: "Invalid challenge" };
    }

    // Check if challenge expired
    if (user.challengeExpiry && user.challengeExpiry < new Date()) {
      return { success: false, message: "Challenge expired" };
    }

    const opts: VerifyAuthenticationResponseOpts = {
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, "base64url"),
        counter: Number(authenticator.counter),
        transports: authenticator.transports?.split(",") as AuthenticatorTransport[] | undefined,
      },
    };

    const verification = await verifyAuthenticationResponse(opts);

    if (!verification.verified) {
      return { success: false, message: "Authentication failed" };
    }

    // Update counter
    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
      },
    });

    // Clear challenge
    await prisma.user.update({
      where: { id: user.id },
      data: {
        webauthnChallenge: null,
        challengeExpiry: null,
        twoFactorVerifiedAt: new Date(),
      },
    });

    // Sign in the user using the 2FA bypass mechanism
    await signIn("credentials", {
      email: user.email,
      password: `2FA_VERIFIED:${user.id}`,
      redirect: false,
    });

    return {
      success: true,
      message: "Authentication successful",
      userId: user.id,
    };
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return {
      success: false,
      message: "Failed to verify authentication",
    };
  }
}

/**
 * Get user's registered passkeys
 */
export async function getUserPasskeys() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return { success: false, message: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        authenticators: {
          select: {
            id: true,
            credentialDeviceType: true,
            credentialBackedUp: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    return {
      success: true,
      authenticators: user.authenticators,
    };
  } catch (error) {
    console.error("Error getting passkeys:", error);
    return {
      success: false,
      message: "Failed to get passkeys",
    };
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskey(authenticatorId: string) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return { success: false, message: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Verify the authenticator belongs to the user
    const authenticator = await prisma.authenticator.findUnique({
      where: { id: authenticatorId },
    });

    if (!authenticator || authenticator.userId !== user.id) {
      return { success: false, message: "Passkey not found" };
    }

    await prisma.authenticator.delete({
      where: { id: authenticatorId },
    });

    return {
      success: true,
      message: "Passkey deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return {
      success: false,
      message: "Failed to delete passkey",
    };
  }
}
