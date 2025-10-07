"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "@/lib/actions/webauthn.actions";

const VerifyPasskeyForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleVerifyPasskey = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check browser support
      if (!window.PublicKeyCredential) {
        setError("Passkeys are not supported in this browser. Please use a modern browser like Chrome, Safari, or Edge.");
        setLoading(false);
        return;
      }

      // Generate authentication options
      const optionsResult = await generatePasskeyAuthenticationOptions();

      if (!optionsResult.success || !optionsResult.options || !optionsResult.challenge) {
        setError(optionsResult.message || "Failed to start passkey verification");
        setLoading(false);
        return;
      }

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication(optionsResult.options);

      // Verify the authentication with the challenge
      const verificationResult = await verifyPasskeyAuthentication(
        authenticationResponse,
        optionsResult.challenge
      );

      if (!verificationResult.success) {
        setError(verificationResult.message || "Failed to verify passkey");
        setLoading(false);
        return;
      }

      // Success!
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        // Force a full reload to ensure database changes are reflected
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      console.error("Passkey verification error:", err);

      const error = err as Error & { name?: string };
      if (error.name === "NotAllowedError") {
        setError("Passkey verification was cancelled. Please try again.");
      } else if (error.name === "InvalidStateError") {
        setError("This passkey is not recognized. Please try a different device or authenticator.");
      } else {
        setError(error.message || "Failed to verify passkey. Please try again.");
      }
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-green-600 dark:text-green-400">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Verification Successful!</h3>
        <p className="text-sm text-muted-foreground">
          Redirecting you to the dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        className="w-full"
        onClick={handleVerifyPasskey}
        disabled={loading}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Verifying passkey...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Verify with Passkey
          </>
        )}
      </Button>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="text-xs text-center text-muted-foreground">
        You&apos;ll be prompted to use your fingerprint, face recognition, or device PIN
      </div>
    </div>
  );
};

export default VerifyPasskeyForm;
