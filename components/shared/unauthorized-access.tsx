import Link from "next/link";
import { Role } from "@prisma/client";
import { getRoleDisplayName } from "@/lib/auth-utils";

interface UnauthorizedAccessProps {
  requiredRole?: Role;
  userRole?: Role;
  message?: string;
}

/**
 * Component to display when user tries to access unauthorized content
 */
export function UnauthorizedAccess({
  requiredRole,
  userRole,
  message,
}: UnauthorizedAccessProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-red-900 mb-2">
          Access Denied
        </h1>
        <p className="text-red-800 mb-6">
          {message ||
            "You don't have permission to access this page."}
        </p>

        {requiredRole && userRole && (
          <div className="bg-white rounded-lg p-4 mb-6 text-sm">
            <p className="text-muted-foreground mb-2">
              <span className="font-semibold">Required Role:</span>{" "}
              {getRoleDisplayName(requiredRole)}
            </p>
            <p className="text-muted-foreground">
              <span className="font-semibold">Your Role:</span>{" "}
              {getRoleDisplayName(userRole)}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/landing"
            className="block text-blue-600 hover:text-blue-800 underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
