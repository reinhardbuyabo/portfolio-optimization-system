"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInDefaultValues } from "@/lib/constants";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { signInWithCredentials } from "@/lib/actions/users.actions";
import { useRouter, useSearchParams } from "next/navigation";

const CredentialsSignInForm = () => {
    const [data, action] = useActionState(signInWithCredentials, {
        success: false,
        message: "",
    });

    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const router = useRouter();

    // Redirect to 2FA verification page on successful credential validation
    useEffect(() => {
        if (data.success && data.requiresTwoFactor && data.email) {
            router.push(`/verify-2fa?email=${encodeURIComponent(data.email)}`);
        }
    }, [data, router]);

    const SignInButton = () => {
        const { pending } = useFormStatus();

        return (
            <Button disabled={pending} className="w-full" variant="default">
                {pending ? "Signing In..." : "Sign In"}
            </Button>
        );
    };

    return (
        <form action={action}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <div className="space-y-6">
                {/* Email */}
                <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        type="email"
                        id="email"
                        name="email"
                        required
                        autoComplete="email"
                        defaultValue={signInDefaultValues.email}
                    />
                </div>

                {/* Password */}
                <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        type="password"
                        id="password"
                        name="password"
                        required
                        autoComplete="current-password"
                        defaultValue={signInDefaultValues.password}
                    />
                </div>

                {/* Submit */}
                <div>
                    <SignInButton />
                </div>

                {/* Success message (redirecting to 2FA) */}
                {data && data.success && data.requiresTwoFactor && (
                    <div className="text-center text-green-600 dark:text-green-400">
                        {data.message}
                    </div>
                )}

                {/* Error display */}
                {data && !data.success && data.message && (
                    <div className="text-center text-destructive">{data.message}</div>
                )}

                {/* Links */}
                <div className="text-sm text-center text-muted-foreground mt-2">
                    Don&apos;t have an account?{" "}
                    <Link href="/sign-up" target="_self" className="link">
                        Sign Up
                    </Link>
                </div>
                <div className="text-sm text-center text-muted-foreground mt-2">
                    Forgot your password?{" "}
                    <Link href="/reset-password" target="_self" className="link">
                        Reset Password
                    </Link>
                </div>
            </div>
        </form>
    );
};

export default CredentialsSignInForm;
