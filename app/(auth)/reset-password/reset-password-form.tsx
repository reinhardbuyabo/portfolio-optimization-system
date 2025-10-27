"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPassword } from "@/lib/actions/users.actions";

const ResetPasswordForm = () => {
  const [data, action] = useActionState(resetPassword, {
    success: false,
    message: "",
  });

  const ResetButton = () => {
    const { pending } = useFormStatus();

    return (
      <Button disabled={pending} className="w-full" variant="default">
        {pending ? "Sending..." : "Send Reset Link"}
      </Button>
    );
  };

  return (
    <form action={action}>
      <div className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <ResetButton />
        </div>

        {data && !data.success && (
          <div className="text-center text-destructive">{data.message}</div>
        )}

        {data && data.success && (
          <div className="text-center text-green-600">{data.message}</div>
        )}

        <div className="text-sm text-center text-muted-foreground mt-2">
          Remembered your password?{" "}
          <Link href="/sign-in" target="_self" className="link">
            Sign In
          </Link>
        </div>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
