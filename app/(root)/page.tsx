import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // If not authenticated, show landing page
  if (!session?.user) {
    redirect("/landing");
  }

  // If authenticated, redirect to dashboard
  redirect("/dashboard");
}

