import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignInContent from "./sign-in-content";

export const metadata: Metadata = {
  title: "Sign In",
};

const SignInPage = async (props: {
  searchParams: Promise<{
    callbackUrl: string;
  }>;
}) => {
  const { callbackUrl } = await props.searchParams;
  const session = await auth();

  if (session) {
    redirect(callbackUrl || "/dashboard");
  }

  return <SignInContent callbackUrl={callbackUrl || "/dashboard"} />;
};

export default SignInPage;
