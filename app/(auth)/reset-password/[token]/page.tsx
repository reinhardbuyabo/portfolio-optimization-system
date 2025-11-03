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
import UpdatePasswordForm from "./update-password-form"; // you'll create this

export const metadata: Metadata = {
  title: "Set New Password",
};

const ResetPasswordTokenPage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

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
          <CardTitle className="text-center">Set a New Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Form that takes token as prop */}
          <UpdatePasswordForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordTokenPage;
