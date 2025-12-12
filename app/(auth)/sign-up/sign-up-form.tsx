"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpDefaultValues } from "@/lib/constants";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUpUser } from "@/lib/actions/users.actions";
import { useSearchParams } from "next/navigation";
import { User, Mail, Lock } from "lucide-react";

const SignUpForm = () => {
  const [data, action] = useActionState(signUpUser, {
    success: false,
    message: "",
  });

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const SignUpButton = () => {
    const { pending } = useFormStatus();

    return (
      <Button 
        disabled={pending} 
        className="w-full h-14 bg-gradient-to-r from-[#f79d00] to-[rgba(247,157,0,0.8)] hover:from-[rgba(247,157,0,0.9)] hover:to-[rgba(247,157,0,0.7)] text-slate-100 font-medium text-base rounded-xl border-0"
        type="submit"
      >
        {pending ? "Submitting..." : "Sign Up"}
      </Button>
    );
  };

  return (
    <form action={action}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-slate-100">
            Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-50/50" />
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              defaultValue={signUpDefaultValues.name}
              placeholder="Enter your name"
              className="h-[50px] pl-11 pr-4 bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-slate-100">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-50/50" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={signUpDefaultValues.email}
              placeholder="your@email.com"
              className="h-[50px] pl-11 pr-4 bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-slate-100">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-50/50" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              defaultValue={signUpDefaultValues.password}
              placeholder="••••••••"
              className="h-[50px] pl-11 pr-4 bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm text-slate-100">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-50/50" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              defaultValue={signUpDefaultValues.confirmPassword}
              placeholder="••••••••"
              className="h-[50px] pl-11 pr-4 bg-[#1e283d] border border-[#1e283d] text-slate-50 placeholder:text-slate-50/50 rounded-xl focus:border-[#1e283d] focus:ring-0"
            />
          </div>
        </div>
        <div>
          <SignUpButton />
        </div>

        {data && !data.success && (
          <div className="text-center text-red-400 text-sm">{data.message}</div>
        )}

        {data && data.success && (
          <div className="text-center text-green-400 text-sm">{data.message}</div>
        )}
      </div>
    </form>
  );
};

export default SignUpForm;
