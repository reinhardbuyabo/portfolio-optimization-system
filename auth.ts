import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
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
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    adapter: PrismaAdapter(prisma),
    providers: [
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

                // Check if user exists and if the password matches
                if (user && user.password) {
                    const isMatch = compareSync(
                        credentials.password as string,
                        user.password,
                    );

                    // If password is correct, return the user
                    if (isMatch) {
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        };
                    }
                }
                // If user doesn't exist or password doesn't match return null
                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }: { session: Session; token: JWT }) {
            // Set the user ID and role from the token
            session.user.id = token.id as string;
            session.user.role = token.role as Role; // Role from your Prisma schema
            session.user.name = token.name as string;

            console.log(token);

            return session;
        },
        async jwt({ token, user, trigger, session }) {
            // assign user fields to token
            if (user) {
                token.role = user.role;

                // if user has no name use the part of the email before the @ as name
                if (user.name === "NO_NAME") {
                    token.name = token.email?.split("@")[0];

                    // update the database to reflect the token name
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { name: token.name },
                    });
                } else {
                    token.name = user.name;
                }


            }
            if (trigger === "update" && session?.user?.name) {
                // Copy updated name into token
                token.name = session.user.name;
            }

            return token;
        },
    },
} satisfies NextAuthConfig; // ensures that the object structure is compatible with the type

export const { handlers, auth, signIn, signOut } = NextAuth(config);
