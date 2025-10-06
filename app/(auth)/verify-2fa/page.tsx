import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import Verify2FAForm from "./verify-2fa-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verify Two-Factor Authentication",
};

const Verify2FAPage = async (props: {
  searchParams: Promise<{
    email?: string;
  }>;
}) => {
  const { email } = await props.searchParams;
  const session = await auth();

  if (session) {
    // If the user is already logged in, redirect to the home page
    redirect("/");
  }

  if (!email) {
    // If no email is provided, redirect back to sign-in
    redirect("/sign-in");
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-4">
          <Link href="/" className="flex-center">
            <Image
              src="/globe.svg"
              width={100}
              height={100}
              alt={`${APP_NAME} logo`}
              priority={true}
            />
          </Link>
          <CardTitle className="text-center">Verify Your Identity</CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit verification code to {email}
          </CardDescription>
          <CardContent className="space-y-4">
            <Verify2FAForm email={email} />
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
};

export default Verify2FAPage;
