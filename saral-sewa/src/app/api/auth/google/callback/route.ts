// app/api/auth/google/callback/route.ts (if you need to handle callback on frontend)

import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Handling Google OAuth callback");

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    console.log("📥 Received callback params:", {
      code: code ? "present" : "missing",
      state,
    });

    if (!code) {
      console.error("❌ No authorization code received");
      return NextResponse.redirect("/login?error=oauth_failed");
    }

    // Forward to backend callback
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL;
    const callbackUrl = `${backendUrl}/auth/google/callback?code=${code}&state=${
      state || ""
    }`;

    console.log("📤 Forwarding to backend callback:", callbackUrl);

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error("❌ Error handling Google OAuth callback:", error);
    return NextResponse.redirect("/login?error=oauth_failed");
  }
}
