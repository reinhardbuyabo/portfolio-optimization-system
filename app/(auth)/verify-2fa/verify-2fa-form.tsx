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
    if (data.success) {
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }
  }, [data.success, router]);

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
      <Button disabled={pending} className="w-full" variant="default">
        {pending ? "Verifying..." : "Verify"}
      </Button>
    );
  };

  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />

      <div className="space-y-6">
        {/* Verification Code */}
        <div className="space-y-1">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            type="text"
            id="code"
            name="code"
            required
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            placeholder="Enter 6-digit code"
            autoComplete="one-time-code"
            autoFocus
            className="text-center text-2xl tracking-widest"
          />
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        {/* Submit */}
        <div>
          <VerifyButton />
        </div>

        {/* Success message */}
        {data && data.success && (
          <div className="text-center text-green-600 dark:text-green-400">
            {data.message}
          </div>
        )}

        {/* Error display */}
        {data && !data.success && data.message && (
          <div className="text-center text-destructive">{data.message}</div>
        )}

        {/* Resend Code */}
        <div className="text-center space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resending}
            onClick={handleResendCode}
          >
            {resending ? "Resending..." : "Resend Code"}
          </Button>
          {resendMessage && (
            <p className="text-xs text-muted-foreground">{resendMessage}</p>
          )}
        </div>

        {/* Back to sign in */}
        <div className="text-sm text-center text-muted-foreground">
          <Link href="/sign-in" className="link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </form>
  );
};

export default Verify2FAForm;
