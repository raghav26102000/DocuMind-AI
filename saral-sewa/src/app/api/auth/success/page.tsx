// src/app/api/auth/success/page.tsx
"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authStateManager } from "../../../utils/auth";

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (token) {
      console.log("✅ Google OAuth successful, logging in...");
      authStateManager.login(token); // This will redirect to home
    } else if (error) {
      console.error("❌ OAuth error:", error);
      router.push("/login?error=oauth_failed");
    } else {
      router.push("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default function AuthSuccess() {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  );
}
