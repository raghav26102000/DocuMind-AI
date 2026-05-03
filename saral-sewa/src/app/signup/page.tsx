"use client";

import React from "react";
import Image from "next/image";
import { useState } from "react";
import { authAPI, ApiRequestError } from "../apiClient";
import { authStateManager } from "../utils/auth";
import "./signup.css";

export default function SignupPage() {
  // Screen states
  const [currentStep, setCurrentStep] = useState<
    "phone" | "otp" | "details" | "complete"
  >("phone");

  // Form data
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    gender: "",
    address: "",
    state: "",
    dob: "",
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Google OAuth states
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Format phone number to include +91
  const formatPhoneNumber = (phone: string) => {
    console.log("🔧 Formatting phone number:", phone);

    // Remove any spaces, dashes, or other characters
    const cleaned = phone.replace(/\D/g, "");
    console.log("🔧 Cleaned phone number:", cleaned);

    // If it starts with 91, add +
    if (cleaned.startsWith("91")) {
      const formatted = `+${cleaned}`;
      console.log("🔧 Formatted phone (starts with 91):", formatted);
      return formatted;
    }

    // If it's a 10-digit number, add +91
    if (cleaned.length === 10) {
      const formatted = `+91${cleaned}`;
      console.log("🔧 Formatted phone (10 digits):", formatted);
      return formatted;
    }

    // If it already starts with +91, return as is
    if (phone.startsWith("+91")) {
      console.log("🔧 Phone already formatted:", phone);
      return phone;
    }

    // Default: add +91
    const formatted = `+91${cleaned}`;
    console.log("🔧 Default formatted phone:", formatted);
    return formatted;
  };

  // Validate form data
  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 4) {
      setError("Password must be at least 4 characters long");
      return false;
    }
    if (!formData.username.match(/^[a-zA-Z0-9_]+$/)) {
      setError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    return true;
  };

  // Step 1: Send OTP to phone number
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📱 Starting OTP send process");
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("📤 Sending OTP for phone:", formattedPhone);

      const response = await authAPI.sendOTP(formattedPhone, "register");

      console.log("✅ OTP Response:", response);
      setSuccess("OTP sent successfully! Please check your phone.");
      setPhoneNumber(formattedPhone); // Update state with formatted number
      setCurrentStep("otp");
    } catch (err) {
      console.error("❌ OTP Error:", err);

      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔐 Starting OTP verification process");
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      console.log("📤 Verifying OTP for phone:", phoneNumber, "with OTP:", otp);

      const response = await authAPI.verifyOTP(phoneNumber, otp);

      console.log("✅ OTP Verification Response:", response);
      setSuccess("Phone number verified successfully!");
      setCurrentStep("details");
    } catch (err) {
      console.error("❌ OTP Verification Error:", err);

      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to verify OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("👤 Starting registration process");
    setError("");
    setSuccess("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Format date properly for backend (expecting DD-MM-YYYY based on the split-reverse logic)
      const formattedDob = formData.dob
        ? formData.dob.split("-").reverse().join("-")
        : "";

      const userData = {
        phone: phoneNumber,
        username: formData.username,
        full_name: formData.full_name,
        dob: formattedDob,
        gender: formData.gender,
        password: formData.password, // Changed from 'pin' to 'password'
        email: formData.email,
        address: formData.address, // Added missing address field
        state: formData.state, // Added missing state field
      };

      console.log("📤 Registration data:", userData);

      const response = await authAPI.register(userData);

      console.log("✅ Registration Response:", response);
      setSuccess("Registration successful! You can now log in.");
      setCurrentStep("complete");
      setTimeout(() => (window.location.href = "/login"), 3000);
    } catch (err) {
      console.error("❌ Registration Error:", err);

      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to complete registration. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    console.log("🔄 Resending OTP");
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("📤 Resending OTP for phone:", formattedPhone);

      const response = await authAPI.sendOTP(formattedPhone, "register");

      console.log("✅ Resend OTP Response:", response);
      setSuccess("OTP resent successfully!");
      setPhoneNumber(formattedPhone); // Update state with formatted number
    } catch (err) {
      console.error("❌ Resend OTP Error:", err);

      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to resend OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    console.log("🔐 Starting Google Sign-in process");
    setIsGoogleLoading(true);
    setError("");

    try {
      // Redirect to Google OAuth endpoint
      window.location.href = "/api/auth/google/login";
    } catch (err: any) {
      console.error("❌ Google Sign-in Error:", err);
      setError("Failed to initiate Google sign-in. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // Skip to Google Sign-in (after OTP verification)
  const handleSkipToGoogle = () => {
    console.log("⏭️ Skipping to Google Sign-in after OTP verification");
    handleGoogleSignIn();
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

      <div className="hero-text my-auto">
        <div className="d-flex w-100 align-items-center flex-column">
          <div className="w-100">
            {/* Step 1: Phone Number Input */}
            {currentStep === "phone" && (
              <>
                <h2 className="mb-3 text-center">Sign-up to get Schemes</h2>
                <button
                  className="btn btn-primary my-2 py-2"
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
                <p className="text-center mb-4" style={{ color: "#1E1E1EB2" }}>
                  Enter your phone number to get started
                </p>
                <form onSubmit={handleSendOTP}>
                  <div className="form-floating mb-3">
                    <input
                      type="tel"
                      className="form-control"
                      id="phoneInput"
                      placeholder="Enter Mobile number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                    <label htmlFor="phoneInput">Enter Mobile Number</label>
                  </div>

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert-success" role="alert">
                      {success}
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-100 mb-3"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === "otp" && (
              <>
                <h2 className="mb-3 text-center">Verify Your Phone</h2>
                <p className="text-center mb-4" style={{ color: "#1E1E1EB2" }}>
                  Enter the OTP sent to {phoneNumber}
                </p>
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

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert-success" role="alert">
                      {success}
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-100 mb-3"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify OTP"}
                  </button>

                  {/* Option to continue with Google after OTP verification */}
                  <div className="text-center mb-3">
                    <span className="text-muted">OR</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 mb-3"
                    onClick={handleSkipToGoogle}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading
                      ? "Redirecting..."
                      : "Continue with Google"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      className="btn btn-link text-decoration-none"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                    >
                      Resend OTP
                    </button>
                    <span className="mx-2">|</span>
                    <button
                      type="button"
                      className="btn btn-link text-decoration-none"
                      onClick={() => setCurrentStep("phone")}
                    >
                      Change Number
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Step 3: Complete Registration */}
            {currentStep === "details" && (
              <>
                <h2 className="mb-3 text-center">Complete Registration</h2>
                <p className="text-center mb-4" style={{ color: "#1E1E1EB2" }}>
                  Fill in your details to complete signup
                </p>
                <form onSubmit={handleCompleteRegistration}>
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="usernameInput"
                      placeholder="Enter Username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      pattern="^[a-zA-Z0-9_]+$"
                      title="Username can only contain letters, numbers, and underscores"
                      required
                    />
                    <label htmlFor="usernameInput">Username</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input
                      type="email"
                      className="form-control"
                      id="emailInput"
                      placeholder="Enter Email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                    <label htmlFor="emailInput">Email</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input
                      type="password"
                      className="form-control"
                      id="passwordInput"
                      placeholder="Enter Password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      minLength={4}
                      required
                    />
                    <label htmlFor="passwordInput">Password</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPasswordInput"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      minLength={4}
                      required
                    />
                    <label htmlFor="confirmPasswordInput">
                      Confirm Password
                    </label>
                  </div>

                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      id="nameInput"
                      placeholder="Enter Name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                    />
                    <label htmlFor="nameInput">Full Name</label>
                  </div>

                  <div className="form-floating mb-3">
                    <select
                      className="form-select"
                      id="genderInput"
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      required
                    >
                      <option value="" disabled>
                        Select Gender
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Others">Others</option>
                    </select>
                    <label htmlFor="genderInput">Gender</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input
                      type="date"
                      className="form-control"
                      id="dobInput"
                      placeholder="Date of Birth"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                      }
                      required
                    />
                    <label htmlFor="dobInput">Date of Birth</label>
                  </div>

                  <div className="form-floating mb-3">
                    <select
                      className="form-select"
                      id="stateInput"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      required
                    >
                      <option value="" disabled>
                        Select State
                      </option>
                      <option value="HR">Haryana</option>
                      <option value="PB">Punjab</option>
                      <option value="Others">Others</option>
                    </select>
                    <label htmlFor="stateInput">State</label>
                  </div>

                  <div className="form-floating mb-3">
                    <textarea
                      rows={2}
                      className="form-control"
                      id="addressInput"
                      placeholder="Enter Address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      required
                    />
                    <label htmlFor="addressInput">Address</label>
                  </div>

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert-success" role="alert">
                      {success}
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-100"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Registering..." : "Complete Registration"}
                  </button>
                </form>
              </>
            )}

            {/* Step 4: Registration Complete */}
            {currentStep === "complete" && (
              <>
                <div className="text-center">
                  <div className="mb-4">
                    <div className="text-success mb-3">
                      <i
                        className="bi bi-check-circle-fill"
                        style={{ fontSize: "3rem" }}
                      ></i>
                    </div>
                    <h2 className="mb-3 text-success">
                      Registration Complete!
                    </h2>
                    <p className="text-muted">
                      Your account has been created successfully. You will be
                      redirected to the login page shortly.
                    </p>
                  </div>

                  <div className="alert alert-success" role="alert">
                    {success}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => (window.location.href = "/login")}
                  >
                    Go to Login
                  </button>
                </div>
              </>
            )}

            {/* Login link - shown on relevant steps */}
            {currentStep !== "complete" && (
              <>
                <div className="d-flex justify-content-center w-100 mt-5">
                  <span className="me-2" style={{ color: "#1E1E1EB2" }}>
                    Have an account?
                  </span>
                  <a
                    href="/login"
                    type="button"
                    className="text-primary text-decoration-none"
                  >
                    Login Now.
                  </a>
                </div>

                <div className="number-link-message">
                  Mobile number should be linked with your Aadhar Number
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
