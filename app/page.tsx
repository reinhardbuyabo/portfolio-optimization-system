import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();
  
  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }
  
  // Otherwise, redirect to landing page
  redirect("/landing");
}



