"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInDefaultValues } from "@/lib/constants";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
    signInWithCredentials,
    send2FACode,
} from "@/lib/actions/users.actions";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const CredentialsSignInForm = () => {
    const [data, action] = useActionState(signInWithCredentials, {
        success: false,
        message: "",
    });

    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [sendingCode, setSendingCode] = useState(false);
    const [codeSent, setCodeSent] = useState(false);

    const handleSendCode = async (formData: FormData) => {
        setSendingCode(true);
        const email = formData.get("email") as string;
        try {
            const res = await send2FACode(email);
            if (res.success) {
                setCodeSent(true);
            }
        } finally {
            setSendingCode(false);
        }
    };

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

                {/* Two-Factor Code */}
                <div className="space-y-1">
                    <Label htmlFor="twoFactorCode">Two-Factor Code</Label>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            id="twoFactorCode"
                            name="twoFactorCode"
                            inputMode="numeric"
                            pattern="\d*"
                            placeholder="Enter 6-digit code"
                            autoComplete="one-time-code"
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={sendingCode}
                            onClick={async () => {
                                const formEl = document.querySelector(
                                    "form",
                                ) as HTMLFormElement;
                                const formData = new FormData(formEl);
                                await handleSendCode(formData);
                            }}
                        >
                            {sendingCode ? "Sending..." : codeSent ? "Resend" : "Send"}
                        </Button>
                    </div>
                    {codeSent && (
                        <p className="text-xs text-muted-foreground">
                            Code sent to your email. Check your inbox.
                        </p>
                    )}
                </div>

                {/* Submit */}
                <div>
                    <SignInButton />
                </div>

                {/* Error display */}
                {data && !data.success && (
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
