"use client";

import Image from "next/image";
import { useState } from "react";
import "../signup/signup.css";

export default function ForgetPasswordPage() {
  const [showResetPasswordScreen, setshowResetPasswordScreen] = useState(false);

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
      {!showResetPasswordScreen && (
        <div className="hero-text my-auto">
          <div className="d-flex w-100 align-items-center flex-column">
            <div className="w-100">
              <div className="d-flex align-items-center mb-3">
                <a className="me-2" type="button" href="/login">
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
                <h2 className="mb-0 mx-auto">Forget Password</h2>
              </div>
              <form>
                <div className="form-floating mb-3">
                  <input
                    type="mail"
                    className="form-control"
                    id="emailIdInput"
                    placeholder="Enter Email ID"
                  />
                  <label htmlFor="emailIdInput">Enter Email ID</label>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setshowResetPasswordScreen(true);
                  }}
                >
                  Request Password
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {showResetPasswordScreen && (
        <div className="hero-text my-auto">
          <div className="d-flex w-100 align-items-center flex-column">
            <div className="w-100">
              <div className="d-flex align-items-center mb-3">
                <a
                  className="me-2"
                  type="button"
                  onClick={() => {
                    setshowResetPasswordScreen(false);
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
                <h2 className="mb-0 mx-auto">Forget Password</h2>
              </div>
              <form>
                <div className="form-floating mb-3">
                  <input
                    type="password"
                    className="form-control"
                    id="passwordInput"
                    placeholder="Enter password"
                  />
                  <label htmlFor="passwordInput">Password</label>
                </div>
                <div className="form-floating mb-3">
                  <input
                    type="newPassword"
                    className="form-control"
                    id="newPasswordInput"
                    placeholder="Enter new password"
                  />
                  <label htmlFor="newPasswordInput">New Password</label>
                </div>
                <button className="btn btn-primary">Submit</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
