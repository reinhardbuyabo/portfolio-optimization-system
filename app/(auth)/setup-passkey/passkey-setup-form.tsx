"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
} from "@/lib/actions/webauthn.actions";

const PasskeySetupForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSetupPasskey = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check browser support
      if (!window.PublicKeyCredential) {
        setError("Passkeys are not supported in this browser. Please use a modern browser like Chrome, Safari, or Edge.");
        setLoading(false);
        return;
      }

      // Generate registration options
      const optionsResult = await generatePasskeyRegistrationOptions();

      if (!optionsResult.success || !optionsResult.options) {
        setError(optionsResult.message || "Failed to start passkey setup");
        setLoading(false);
        return;
      }

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(optionsResult.options);

      // Verify the registration
      const verificationResult = await verifyPasskeyRegistration(registrationResponse);

      if (!verificationResult.success) {
        setError(verificationResult.message || "Failed to verify passkey");
        setLoading(false);
        return;
      }

      // Success!
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("Passkey setup error:", err);

      if (err.name === "NotAllowedError") {
        setError("Passkey setup was cancelled. Please try again.");
      } else if (err.name === "InvalidStateError") {
        setError("This passkey is already registered. Please try a different device or authenticator.");
      } else {
        setError(err.message || "Failed to setup passkey. Please try again.");
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
        <h3 className="text-lg font-semibold">Passkey Setup Complete!</h3>
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
        onClick={handleSetupPasskey}
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
            Setting up passkey...
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            Create Passkey
          </>
        )}
      </Button>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="text-xs text-center text-muted-foreground">
        You'll be prompted to use your fingerprint, face recognition, or device PIN
      </div>
    </div>
  );
};

export default PasskeySetupForm;
