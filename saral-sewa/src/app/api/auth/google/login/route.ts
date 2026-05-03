// app/api/auth/google/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔗 Redirecting to backend Google OAuth endpoint");

    // Get the backend URL from environment variables
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL;
    const googleAuthUrl = `${backendUrl}/auth/google/login`;

    console.log("📤 Redirecting to:", googleAuthUrl);

    // Redirect to your FastAPI backend's Google OAuth endpoint
    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error("❌ Error redirecting to Google OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google sign-in" },
      { status: 500 }
    );
  }
}
