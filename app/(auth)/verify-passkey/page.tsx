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
import VerifyPasskeyForm from "./verify-passkey-form";

export const metadata: Metadata = {
  title: "Verify Passkey",
};

const VerifyPasskeyPage = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    // Not signed in, redirect to sign-in
    redirect("/sign-in");
  }

  // Check if user has a passkey
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      authenticators: true,
    },
  });

  if (!user?.authenticators || user.authenticators.length === 0) {
    // User doesn't have a passkey, redirect to setup
    redirect("/setup-passkey");
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
          <CardTitle className="text-center">Verify Your Identity</CardTitle>
          <CardDescription className="text-center">
            Use your passkey to complete sign-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Second Factor Required</h3>
            <p className="text-sm text-muted-foreground">
              You've successfully authenticated with your first factor. Now verify your passkey to complete sign-in.
            </p>
          </div>

          <VerifyPasskeyForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyPasskeyPage;
