"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "@/lib/actions/webauthn.actions";

const PasskeySignInButton = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePasskeySignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check browser support
      if (!window.PublicKeyCredential) {
        setError("Passkeys are not supported in this browser");
        setLoading(false);
        return;
      }

      // Generate authentication options
      const optionsResult = await generatePasskeyAuthenticationOptions();

      if (!optionsResult.success || !optionsResult.options) {
        setError(optionsResult.message || "Failed to start authentication");
        setLoading(false);
        return;
      }

      // Start WebAuthn authentication
      const authResponse = await startAuthentication(optionsResult.options);

      // Verify the authentication
      const verificationResult = await verifyPasskeyAuthentication(
        authResponse,
        optionsResult.challenge!
      );

      if (!verificationResult.success) {
        setError(verificationResult.message || "Authentication failed");
        setLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Passkey sign-in error:", err);

      if (err.name === "NotAllowedError") {
        setError("Authentication was cancelled");
      } else if (err.name === "InvalidStateError") {
        setError("No passkey found. Please sign in with another method or register a passkey.");
      } else {
        setError(err.message || "Failed to sign in with passkey");
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handlePasskeySignIn}
        disabled={loading}
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        {loading ? "Authenticating..." : "Sign in with Passkey"}
      </Button>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
};

export default PasskeySignInButton;
