import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import PasskeySetupForm from "./passkey-setup-form";

export const metadata: Metadata = {
  title: "Setup Passkey",
};

const SetupPasskeyPage = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    // Not signed in, redirect to sign-in
    redirect("/sign-in");
  }

  // Check if user already has a passkey
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      authenticators: true,
    },
  });

  if (user?.authenticators && user.authenticators.length > 0) {
    // User already has a passkey, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex-center">
            <Image
              src="/globe.svg"
              width={100}
              height={100}
              alt={`${APP_NAME} logo`}
              priority={true}
            />
          </div>
          <CardTitle className="text-center">Setup Your Passkey</CardTitle>
          <CardDescription className="text-center">
            Complete your account security by adding a passkey. This will be your second factor for authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Why use a passkey?</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>More secure than passwords</li>
              <li>Sign in with biometrics (fingerprint, Face ID)</li>
              <li>Protected against phishing</li>
              <li>Works across your devices</li>
            </ul>
          </div>

          <PasskeySetupForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPasskeyPage;
