import { auth } from "@/auth";
import { RoleUIDemo } from "@/components/shared/role-ui-demo";
import { AuthRequired } from "@/components/shared/auth-required";

/**
 * Demo page to showcase role-based UI rendering
 */
export default async function RoleDemoPage() {
  const session = await auth();

  if (!session?.user) {
    return <AuthRequired message="Sign in to see the role-based UI demo." />;
  }

  return (
    <main className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Role-Based UI Demo</h1>
        <p className="text-muted-foreground mt-2">
          This page demonstrates how different UI components are shown based on user
          roles.
        </p>
      </div>

      <RoleUIDemo />
    </main>
  );
}
