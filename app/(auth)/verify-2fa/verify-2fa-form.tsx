"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  verifyTwoFactorCode,
  resend2FACode,
} from "@/lib/actions/users.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

const Verify2FAForm = ({ email }: { email: string }) => {
  const [data, action] = useActionState(verifyTwoFactorCode, {
    success: false,
    message: "",
  });

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const router = useRouter();

  // Redirect on successful verification
  useEffect(() => {
    if (data?.success) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    }
  }, [data?.success, router]);

  const handleResendCode = async () => {
    setResending(true);
    setResendMessage("");
    try {
      const result = await resend2FACode(email);
      setResendMessage(result.message);
    } catch (error) {
      setResendMessage("Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const VerifyButton = () => {
    const { pending } = useFormStatus();

    return (
      <Button 
        disabled={pending} 
        className="w-full h-14 bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)] hover:from-[rgba(247,157,0,0.9)] hover:to-[rgba(247,157,0,0.7)] text-slate-100 font-medium text-base rounded-xl border-0"
        type="submit"
      >
        {pending ? "Verifying..." : "Verify"}
      </Button>
    );
  };

  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />

      <div className="space-y-5">
        {/* Verification Code */}
        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm text-slate-100">
            Verification Code
          </Label>
          <Input
            type="text"
            id="code"
            name="code"
            required
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            className="h-[50px] bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0 text-center text-2xl tracking-widest"
          />
          <p className="text-xs text-[#9398a1]">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        {/* Submit */}
        <div>
          <VerifyButton />
        </div>

        {/* Success message */}
        {data && data.success && (
          <div className="text-center text-green-400 text-sm">
            {data.message}
          </div>
        )}

        {/* Error display */}
        {data && !data.success && data.message && (
          <div className="text-center text-red-400 text-sm">{data.message}</div>
        )}

        {/* Resend Code */}
        <div className="text-center space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resending}
            onClick={handleResendCode}
            className="text-sm text-[#9398a1] hover:text-slate-100 hover:bg-[#1e283d]"
          >
            {resending ? "Resending..." : "Resend Code"}
          </Button>
          {resendMessage && (
            <p className="text-xs text-[#9398a1]">{resendMessage}</p>
          )}
        </div>

        {/* Back to sign in */}
        <div className="text-sm text-center text-[#9398a1]">
          <Link href="/sign-in" className="text-[#f79d00] hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </form>
  );
};

export default Verify2FAForm;
