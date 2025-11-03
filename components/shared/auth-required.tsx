import Link from "next/link";

interface AuthRequiredProps {
  message?: string;
  redirectPath?: string;
}

/**
 * Component to display when authentication is required
 */
export function AuthRequired({
  message = "You need to sign in to access this feature.",
  redirectPath,
}: AuthRequiredProps) {
  const currentPath = redirectPath || (typeof window !== 'undefined' ? window.location.pathname : '');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-yellow-900 mb-2">
          Authentication Required
        </h1>
        <p className="text-yellow-800 mb-6">{message}</p>

        <div className="bg-white rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            Create a free account to access:
          </p>
          <ul className="text-sm text-left space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Portfolio optimization tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Real-time investment insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Risk analysis and backtesting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Personalized recommendations</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link
            href={`/sign-up${currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`}
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Create Free Account
          </Link>
          <Link
            href={`/sign-in${currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`}
            className="block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition border-2 border-blue-600"
          >
            Sign In
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
