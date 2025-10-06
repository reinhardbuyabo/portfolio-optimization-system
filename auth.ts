import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compareSync } from "bcrypt-ts-edge";
import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { Role } from "@prisma/client";

export const config = {
    pages: {
        signIn: "/sign-in",
        error: "/sign-in",
    },
    session: {
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60,
    },
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        CredentialsProvider({
            credentials: {
                email: { type: "email" },
                password: { type: "password" },
            },
            async authorize(credentials) {
                if (credentials == null) return null;

                // find user in database
                const user = await prisma.user.findFirst({
                    where: {
                        email: credentials.email as string,
                    },
                });

                if (!user || !user.password) return null;

                // Check if this is a 2FA verification bypass
                const password = credentials.password as string;
                if (password.startsWith('2FA_VERIFIED:')) {
                    const userId = password.replace('2FA_VERIFIED:', '');
                    // Verify the user ID matches and 2FA was recently verified
                    if (user.id === userId && user.twoFactorVerifiedAt) {
                        const verifiedRecently = new Date().getTime() - user.twoFactorVerifiedAt.getTime() < 60000; // Within 1 minute
                        if (verifiedRecently) {
                            return {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                            };
                        }
                    }
                    return null;
                }

                // Normal password verification
                const isMatch = compareSync(password, user.password);

                // If password is correct, return the user
                if (isMatch) {
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    };
                }

                // If user doesn't exist or password doesn't match return null
                return null;
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Always allow sign-in, redirects are handled in redirect callback
            return true;
        },
        async redirect({ url, baseUrl }) {
            // After successful OAuth sign-in, check if user has passkey
            // This runs after the user is authenticated

            // If the URL is the callback URL (after OAuth), check passkey status
            if (url.includes('/api/auth/callback/google')) {
                // We can't access session here directly, so we'll use a different approach
                // Return to default and let middleware/pages handle it
                return baseUrl;
            }

            // For other redirects, use default behavior
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
        async session({ session, user }: { session: Session; user: any }) {
            // Add user info to session (database strategy uses user object, not token)
            if (user) {
                session.user.id = user.id;
                session.user.role = user.role;
                session.user.name = user.name;
            }

            return session;
        },
    },
} satisfies NextAuthConfig; // ensures that the object structure is compatible with the type

export const { handlers, auth, signIn, signOut } = NextAuth(config);
