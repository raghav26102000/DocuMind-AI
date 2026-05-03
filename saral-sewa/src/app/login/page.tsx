"use client";

import Image from "next/image";
import { useState } from "react";
import { authAPI, ApiRequestError } from "../apiClient";
import { authStateManager } from "../utils/auth";

import "./login.css";

export default function LoginPage() {
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [showOTPScreen, setShowOTPScreen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Format phone number to include +91 (same as signup)
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91")) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (phone.startsWith("+91")) {
      return phone;
    }
    return `+91${cleaned}`;
  };

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    console.log("🔐 Starting Google Sign-in process");
    setIsGoogleLoading(true);
    setLoginError("");

    try {
      // Redirect to Google OAuth endpoint
      window.location.href = "/api/auth/google/login";
    } catch (err: any) {
      console.error("❌ Google Sign-in Error:", err);
      setLoginError("Failed to initiate Google sign-in. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // Send OTP for login
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("📤 Sending OTP for login:", formattedPhone);

      const response = await authAPI.sendOTP(formattedPhone, "login");
      console.log("✅ OTP Response:", response);

      setPhoneNumber(formattedPhone);
      setShowOTPScreen(true);
      setShowMobileLogin(false);
    } catch (err) {
      console.error("❌ OTP Error:", err);
      if (err instanceof ApiRequestError) {
        setLoginError(err.message);
      } else {
        setLoginError("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Verify OTP and login
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      console.log("📤 Verifying OTP for login:", phoneNumber, "with OTP:", otp);

      const response = await authAPI.verifyOTP(phoneNumber, otp);
      console.log("✅ OTP Verification Response:", response);

      // If verification successful, complete login
      if (response.access_token) {
        authStateManager.login(response.access_token);
        window.location.href = "/";
      }
    } catch (err) {
      console.error("❌ OTP Verification Error:", err);
      if (err instanceof ApiRequestError) {
        setLoginError(err.message);
      } else {
        setLoginError("Failed to verify OTP. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await authAPI.sendOTP(phoneNumber, "login");
      console.log("✅ Resend OTP Response:", response);
    } catch (err) {
      console.error("❌ Resend OTP Error:", err);
      if (err instanceof ApiRequestError) {
        setLoginError(err.message);
      } else {
        setLoginError("Failed to resend OTP. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <section className="hero-section">
      <div className="site-benefits">
        <h2>🌐 Your Gateway to Government Benefits</h2>
        <h5>📋 Explore, Apply & Track All Government Schemes in One Place</h5>
        <ul style={{ listStyle: "none" }}>
          <li>✅ Find the Right Schemes for You</li>
          <li>✅ Apply Seamlessly Online</li>
          <li>✅ Track Application Status Instantly</li>
          <li>✅ Safe & Secure Access</li>
        </ul>
      </div>
      {!showMobileLogin && !showOTPScreen && (
        <div className="hero-text">
          <div className="d-flex w-100 align-items-center flex-column">
            <h2 className="mb-3">Login</h2>
            <button
              className="btn btn-primary mb-3"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              <svg
                className="me-2"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="0.5" width="33" height="34" rx="10" fill="white" />
                <g clipPath="url(#clip0_177_2)">
                  <rect
                    x="6"
                    y="6"
                    width="22"
                    height="22"
                    rx="5"
                    fill="white"
                  />
                  <path
                    d="M27.9885 17.2057C27.9885 16.3044 27.9137 15.6467 27.7517 14.9646H17.2192V19.0328H23.4015C23.2769 20.0437 22.6039 21.5663 21.1081 22.5894L21.0871 22.7256L24.4173 25.2466L24.648 25.2691C26.7669 23.3568 27.9885 20.5431 27.9885 17.2057Z"
                    fill="#3792DE"
                  />
                  <path
                    d="M17.2192 27.9245C20.248 27.9245 22.7907 26.95 24.648 25.2692L21.1081 22.5895C20.1608 23.2351 18.8894 23.6857 17.2192 23.6857C14.2527 23.6857 11.7349 21.7735 10.8373 19.1304L10.7058 19.1413L7.24304 21.76L7.19775 21.8831C9.04247 25.464 12.8317 27.9245 17.2192 27.9245Z"
                    fill="#34A853"
                  />
                  <path
                    d="M10.8374 19.1303C10.6006 18.4482 10.4635 17.7174 10.4635 16.9622C10.4635 16.207 10.6006 15.4762 10.8249 14.7941L10.8186 14.6489L7.31249 11.988L7.19778 12.0414C6.43748 13.5274 6.00122 15.1961 6.00122 16.9622C6.00122 18.7284 6.43748 20.397 7.19778 21.883L10.8374 19.1303Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M17.2192 10.2387C19.3256 10.2387 20.7466 11.1278 21.5568 11.8709L24.7227 8.85018C22.7783 7.08405 20.248 6 17.2192 6C12.8317 6 9.04247 8.46039 7.19775 12.0414L10.8249 14.7941C11.7349 12.151 14.2527 10.2387 17.2192 10.2387Z"
                    fill="#EB4335"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_177_2">
                    <rect
                      x="6"
                      y="6"
                      width="22"
                      height="22"
                      rx="5"
                      fill="white"
                    />
                  </clipPath>
                </defs>
              </svg>
              {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
            </button>
            <button
              onClick={() => setShowMobileLogin(true)}
              className="btn bg-white border text-center w-100 py-3"
            >
              Continue with Mobile
            </button>
            <div className="position-relative my-4 w-100">
              <hr />
              <span className="or-span">or</span>
            </div>
            <form
              className="w-100 mb-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoginError("");
                setLoginLoading(true);
                try {
                  let email_phone_username = (
                    e.currentTarget.elements.namedItem(
                      "floatingInput"
                    ) as HTMLInputElement
                  ).value;
                  const password = (
                    e.currentTarget.elements.namedItem(
                      "floatingPassword"
                    ) as HTMLInputElement
                  ).value;

                  // If email_phone_username looks like a phone number, format it
                  if (
                    /^\d{10}$/.test(email_phone_username.replace(/\D/g, ""))
                  ) {
                    email_phone_username =
                      formatPhoneNumber(email_phone_username);
                  }

                  // Call backend login endpoint using authAPI
                  const res = await authAPI.login(
                    email_phone_username,
                    password
                  );

                  console.log("🔍 Full response:", res);
                  console.log("🔍 Access token:", res.data.access_token);

                  // Use authStateManager.login() instead of authStateManager.setToken()
                  if (res.data.access_token) {
                    console.log("🔍 Login successful, processing...");
                    authStateManager.login(res.data.access_token);
                    // authStateManager.login() handles both token storage and redirect
                  } else {
                    console.error(
                      "❌ No access_token in response. Full response:",
                      res
                    );
                    setLoginError("Login response missing access token");
                  }
                } catch (err: any) {
                  console.error("❌ Login error details:", err);

                  if (err instanceof ApiRequestError) {
                    setLoginError(err.message);
                  } else {
                    setLoginError("Login failed. Please try again.");
                  }
                } finally {
                  setLoginLoading(false);
                }
              }}
            >
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="floatingInput"
                  placeholder="Email, Username or Phone"
                  required
                />
                <label htmlFor="floatingInput">Email, Username or Phone</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control"
                  id="floatingPassword"
                  placeholder="Password/PIN"
                  required
                />
                <label htmlFor="floatingPassword">Password/PIN</label>
              </div>
              {loginError && (
                <div className="alert alert-danger" role="alert">
                  {loginError}
                </div>
              )}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in..." : "Log in"}
              </button>
            </form>
            <a
              href="/forget-password"
              type="button"
              className="mb-3 text-decoration-none"
              style={{ color: "#1E1E1EB2" }}
            >
              Forget Password?
            </a>
            <div className="d-flex align-items-center mt-auto">
              <span className="me-2" style={{ color: "#1E1E1EB2" }}>
                Don&apos;t Have an account?
              </span>
              <a
                href="/signup"
                type="button"
                className="text-primary text-decoration-none"
              >
                Signup Now.
              </a>
            </div>
          </div>
        </div>
      )}
      {showMobileLogin && !showOTPScreen && (
        <div className="hero-text my-auto">
          <div className="d-flex w-100 align-items-center flex-column">
            <div className="w-100">
              <div className="d-flex align-items-center mb-3">
                <a
                  className="me-2"
                  type="button"
                  onClick={() => setShowMobileLogin(false)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"
                      fill="black"
                    />
                  </svg>
                </a>
                <h2 className="mb-0 mx-auto">Login with Mobile</h2>
              </div>
              <form onSubmit={handleSendOTP}>
                <div className="form-floating mb-3">
                  <input
                    type="tel"
                    className="form-control"
                    id="numberInput"
                    placeholder="Enter Mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <label htmlFor="numberInput">Enter Mobile Number</label>
                </div>
                {loginError && (
                  <div className="alert alert-danger" role="alert">
                    {loginError}
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            </div>

            <div className="d-flex align-items-center mt-5">
              <span className="me-2" style={{ color: "#1E1E1EB2" }}>
                Don't Have an account?
              </span>
              <a
                href="/signup"
                type="button"
                className="text-primary text-decoration-none"
              >
                Signup Now.
              </a>
            </div>
            <div className="number-link-message">
              Mobile number should be linked with your Aadhar Number
            </div>
          </div>
        </div>
      )}
      {!showMobileLogin && showOTPScreen && (
        <div className="hero-text my-auto">
          <div className="d-flex w-100 align-items-center flex-column">
            <div className="w-100">
              <div className="d-flex align-items-center mb-3">
                <a
                  className="me-2"
                  type="button"
                  onClick={() => {
                    setShowOTPScreen(false);
                    setShowMobileLogin(true);
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"
                      fill="black"
                    />
                  </svg>
                </a>
                <h2 className="mb-0 mx-auto">
                  {phoneNumber.replace(/(\+91)(\d{6})(\d{4})/, "$1******$3")}
                </h2>
              </div>
              <form onSubmit={handleVerifyOTP}>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className="form-control"
                    id="otpInput"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <label htmlFor="otpInput">Enter OTP</label>
                </div>
                {loginError && (
                  <div className="alert alert-danger" role="alert">
                    {loginError}
                  </div>
                )}
                <button
                  className="btn btn-primary mb-3"
                  type="submit"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Verifying..." : "Verify"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none"
                    onClick={handleResendOTP}
                    disabled={loginLoading}
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            </div>

            <div className="d-flex align-items-center mt-5">
              <span className="me-2" style={{ color: "#1E1E1EB2" }}>
                Don't Have an account?
              </span>
              <a
                href="/signup"
                type="button"
                className="text-primary text-decoration-none"
              >
                Signup Now.
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
