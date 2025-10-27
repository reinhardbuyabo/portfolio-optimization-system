"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword } from "@/lib/actions/users.actions";
import { useEffect } from "react";

interface UpdatePasswordFormProps {
  token: string;
}

const UpdatePasswordForm = ({ token }: UpdatePasswordFormProps) => {
  const [data, action] = useActionState(
    async (
      _prevState: { success: boolean; message: string; redirectTo?: string },
      formData: FormData,
    ) => {
      return updatePassword(token, formData);
    },
    { success: false, message: "", redirectTo: "" },
  );

  const UpdatePasswordButton = () => {
    const { pending } = useFormStatus();
    return (
      <Button disabled={pending} className="w-full" variant="default">
        {pending ? "Updating..." : "Update Password"}
      </Button>
    );
  };

  // Handle redirect on success
  useEffect(() => {
    if (data.success && data.redirectTo) {
      // Replace with a toast component if you have one
      alert(data.message);
      window.location.href = data.redirectTo;
    }
  }, [data]);

  return (
    <form action={action}>
      <div className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <UpdatePasswordButton />
        </div>

        {data && !data.success && (
          <div className="text-center text-destructive">{data.message}</div>
        )}
      </div>
    </form>
  );
};

export default UpdatePasswordForm;
