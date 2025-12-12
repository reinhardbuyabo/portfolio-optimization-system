import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Verify2FAContent from "./verify-2fa-content";

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
    redirect("/");
  }

  if (!email) {
    redirect("/sign-in");
  }

  return <Verify2FAContent email={email} />;
};

export default Verify2FAPage;
