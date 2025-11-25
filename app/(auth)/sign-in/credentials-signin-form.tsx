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
import { Mail, Lock } from "lucide-react";

const CredentialsSignInForm = () => {
    const [data, action] = useActionState(signInWithCredentials, {
        success: false,
        message: "",
    });

    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
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
            <Button 
                disabled={pending} 
                className="w-full h-14 bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)] hover:from-[rgba(247,157,0,0.9)] hover:to-[rgba(247,157,0,0.7)] text-slate-100 font-medium text-base rounded-xl border-0"
                type="submit"
            >
                {pending ? "Signing In..." : "Sign In"}
            </Button>
        );
    };

    return (
        <form action={action}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <div className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-slate-100">
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-50/50" />
                        <Input
                            type="email"
                            id="email"
                            name="email"
                            required
                            autoComplete="email"
                            defaultValue={signInDefaultValues.email}
                            placeholder="your@email.com"
                            className="h-[50px] pl-11 pr-4 bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm text-slate-100">
                        Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-50/50" />
                        <Input
                            type="password"
                            id="password"
                            name="password"
                            required
                            autoComplete="current-password"
                            defaultValue={signInDefaultValues.password}
                            placeholder="••••••••"
                            className="h-[50px] pl-11 pr-4 bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0"
                        />
                    </div>
                </div>

                {/* Remember & Forgot Password */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="enable2fa"
                            name="enable2fa"
                            className="w-[13px] h-[13px] rounded border-[#1e283d] bg-[#1e283d] text-[#f79d00] focus:ring-0"
                        />
                        <Label htmlFor="enable2fa" className="text-sm text-slate-100 cursor-pointer">
                            Enable 2FA
                        </Label>
                    </div>
                    <Link 
                        href="/reset-password" 
                        className="text-sm text-[#9398a1] hover:text-slate-100 hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                {/* Submit */}
                <div>
                    <SignInButton />
                </div>

                {/* Success message (redirecting to 2FA) */}
                {data && data.success && data.requiresTwoFactor && (
                    <div className="text-center text-green-400 text-sm">
                        {data.message}
                    </div>
                )}

                {/* Error display */}
                {data && !data.success && data.message && (
                    <div className="text-center text-red-400 text-sm">{data.message}</div>
                )}
            </div>
        </form>
    );
};

export default CredentialsSignInForm;
