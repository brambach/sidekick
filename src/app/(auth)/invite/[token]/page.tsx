"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SignUp, useUser, useSignUp } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface InviteData {
  email: string;
  role: "admin" | "client";
  clientName?: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { signUp } = useSignUp();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    // Validate the invite token
    async function validateInvite() {
      try {
        const response = await fetch("/api/invites/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Invalid invite");
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.valid) {
          setInvite(data.invite);

          // If already signed in, accept the invite immediately
          if (isSignedIn) {
            acceptInvite();
          }
        } else {
          setError("Invalid or expired invite");
        }
        setLoading(false);
      } catch (err) {
        console.error("Error validating invite:", err);
        setError("Failed to validate invite");
        setLoading(false);
      }
    }

    validateInvite();
  }, [token, isSignedIn]);

  const acceptInvite = async () => {
    setAcceptingInvite(true);
    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept invite");
      }

      const data = await response.json();

      // Redirect to appropriate dashboard
      if (data.role === "admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/client");
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Failed to accept invite");
      setAcceptingInvite(false);
    }
  };

  // After successful Clerk signup, accept the invite
  const handleSignUpComplete = async () => {
    await acceptInvite();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-gray-600">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg border border-red-200 p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (acceptingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Image
            src="/images/dd-logo.png"
            alt="Digital Directions"
            width={160}
            height={40}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Digital Directions!
          </h1>
          <p className="text-gray-600">
            You've been invited to join as a{" "}
            <strong>{invite?.role === "admin" ? "team member" : "client"}</strong>
            {invite?.clientName && (
              <>
                {" "}
                for <strong>{invite.clientName}</strong>
              </>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Email: <strong>{invite?.email}</strong>
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
          afterSignUpUrl={`/api/invites/accept?token=${token}`}
          signInUrl="/sign-in"
          redirectUrl={`/api/invites/accept?token=${token}`}
        />

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <a href="/sign-in" className="text-purple-600 hover:text-purple-700 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
