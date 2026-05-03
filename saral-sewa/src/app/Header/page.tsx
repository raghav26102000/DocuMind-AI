"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { authStateManager } from "../utils/auth";
import { authAPI, ApiRequestError } from "../apiClient";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const [showingNavbar, setShowingNavbar] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const pathname = usePathname();

  const toggleNavbar = () => {
    setShowingNavbar(!showingNavbar);
  };

  // Check authentication status on component mount and token changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuthenticated = authStateManager.isAuthenticated();
      setUserLoggedIn(isAuthenticated);
    };

    // Check initial auth status
    checkAuthStatus();

    // Listen for auth state changes
    const handleAuthChange = () => {
      checkAuthStatus();
    };

    // Add event listener for auth state changes
    window.addEventListener("authStateChange", handleAuthChange);

    return () => {
      window.removeEventListener("authStateChange", handleAuthChange);
    };
  }, []);

  // Automatically show navbar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowingNavbar(true); // always visible on desktop
      } else {
        setShowingNavbar(false); // hide on mobile by default
      }
    };

    handleResize(); // set initial value

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      console.log("🔓 Starting logout process");

      // Call logout API
      const response = await authAPI.logout();

      console.log("✅ Logout successful:", response);

      // Close modal
      const modal = document.getElementById("logoutModal");
      if (modal) {
        const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(
          modal
        );
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      }

      // Small delay to ensure auth state has been cleared
      setTimeout(() => {
        console.log("🔄 Redirecting to login page");
        window.location.href = "/login";
      }, 100);
    } catch (err) {
      console.error("❌ Logout error:", err);

      // Even if logout fails, still redirect to login
      // because auth state has been cleared
      const modal = document.getElementById("logoutModal");
      if (modal) {
        const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(
          modal
        );
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      }

      // Show error but still redirect after a short delay
      if (err instanceof ApiRequestError) {
        setLogoutError(err.message);
      } else {
        setLogoutError("Logout failed. Please try again.");
      }

      // Redirect even on error since we cleared auth state
      setTimeout(() => {
        console.log("🔄 Redirecting to login page (after error)");
        window.location.href = "/login";
      }, 1500); // Give user time to see error message
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header>
      <div className="header-wrapper">
        <p className="icon-name d-flex align-items-center">
          <svg
            className="me-2"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 4C6.93913 4 5.92172 4.42143 5.17157 5.17157C4.42143 5.92172 4 6.93913 4 8V19.994C4 21.0549 4.42143 22.0723 5.17157 22.8224C5.92172 23.5726 6.93913 23.994 8 23.994H12.01V26.016H9.012C8.74678 26.016 8.49243 26.1214 8.30489 26.3089C8.11736 26.4964 8.012 26.7508 8.012 27.016C8.012 27.2812 8.11736 27.5356 8.30489 27.7231C8.49243 27.9106 8.74678 28.016 9.012 28.016H23.004C23.2692 28.016 23.5236 27.9106 23.7111 27.7231C23.8986 27.5356 24.004 27.2812 24.004 27.016C24.004 26.7508 23.8986 26.4964 23.7111 26.3089C23.5236 26.1214 23.2692 26.016 23.004 26.016H20.004V23.996H24C25.0609 23.996 26.0783 23.5746 26.8284 22.8244C27.5786 22.0743 28 21.0569 28 19.996V8C28 6.93913 27.5786 5.92172 26.8284 5.17157C26.0783 4.42143 25.0609 4 24 4H8ZM18.006 23.994V26.016H14.01V23.996L18.006 23.994ZM6 8C6 7.46957 6.21071 6.96086 6.58579 6.58579C6.96086 6.21071 7.46957 6 8 6H24C24.5304 6 25.0391 6.21071 25.4142 6.58579C25.7893 6.96086 26 7.46957 26 8V19.994C26 20.5244 25.7893 21.0331 25.4142 21.4082C25.0391 21.7833 24.5304 21.994 24 21.994H8C7.46957 21.994 6.96086 21.7833 6.58579 21.4082C6.21071 21.0331 6 20.5244 6 19.994V8Z"
              fill="#2279E4"
            />
            <path d="M5 18.5L11 13.5V10" stroke="#2279E4" strokeWidth="2" />
            <circle cx="11" cy="10" r="1" fill="#2279E4" />
            <path
              d="M7 22.5L15.5 15.5V9.5"
              stroke="#2279E4"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M26 21.5L20.5 17"
              stroke="#2279E4"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="16" r="2" fill="#2279E4" />
            <circle cx="16" cy="9" r="2" fill="#2279E4" />
            <circle cx="11" cy="9" r="2" fill="#2279E4" />
          </svg>
          Saral Sewa
        </p>
        <nav
          className={`${showingNavbar ? "mobile-nav-show" : "mobile-nav-hide"}`}
        >
          <button className="btn-close mt-2 me-2" onClick={toggleNavbar}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.875 7.125L7.125 16.875M7.125 7.125L16.875 16.875"
                stroke="#2279e4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Link href="/home" className={pathname === "/home" ? "active" : ""}>
            Home
          </Link>
          <Link
            href="/about-us"
            className={pathname === "/about-us" ? "active" : ""}
          >
            About Us
          </Link>
          <Link
            href="/contact-us"
            className={pathname === "/contact-us" ? "active" : ""}
          >
            Contact
          </Link>
          {!userLoggedIn && (
            <a href="/login" className="btn btn-primary d-none d-md-block">
              Login
            </a>
          )}
          {userLoggedIn && (
            <div className="dropdown d-none d-md-block">
              <button
                className="btn p-0 border-0 user-initial"
                type="button"
                id="dropdownMenuButton1"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="d-flex align-items-center">
                  <span>S</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.63556 10.707C1.82309 10.8945 2.0774 10.9998 2.34256 10.9998C2.60772 10.9998 2.86203 10.8945 3.04956 10.707L7.99956 5.75705L12.9496 10.707C13.1382 10.8892 13.3908 10.99 13.653 10.9877C13.9152 10.9854 14.166 10.8803 14.3514 10.6949C14.5368 10.5095 14.642 10.2586 14.6442 9.99645C14.6465 9.73425 14.5457 9.48165 14.3636 9.29305L8.70656 3.63605C8.51903 3.44858 8.26472 3.34326 7.99956 3.34326C7.7344 3.34326 7.48009 3.44858 7.29256 3.63605L1.63556 9.29305C1.44809 9.48058 1.34277 9.73488 1.34277 10C1.34277 10.2652 1.44809 10.5195 1.63556 10.707Z"
                      fill="black"
                    />
                  </svg>
                </div>
              </button>
              <ul
                className="dropdown-menu"
                aria-labelledby="dropdownMenuButton1"
              >
                <li>
                  <a href="/user-profile" className="dropdown-item">
                    View Profile
                  </a>
                </li>
                <li>
                  <a href="/schemes-status" className="dropdown-item">
                    Schemes
                  </a>
                </li>
                <li>
                  <a
                    className="dropdown-item"
                    data-bs-toggle="modal"
                    data-bs-target="#logoutModal"
                    style={{ cursor: "pointer" }}
                  >
                    Logout
                  </a>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {!userLoggedIn && (
          <a href="/login" className="btn btn-primary d-md-none ms-auto">
            Login
          </a>
        )}
        {userLoggedIn && (
          <div className="dropdown d-md-none ms-auto">
            <button
              className="btn p-0 border-0 user-initial"
              type="button"
              id="dropdownMenuButton1"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="d-flex align-items-center">
                <span>S</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.63556 10.707C1.82309 10.8945 2.0774 10.9998 2.34256 10.9998C2.60772 10.9998 2.86203 10.8945 3.04956 10.707L7.99956 5.75705L12.9496 10.707C13.1382 10.8892 13.3908 10.99 13.653 10.9877C13.9152 10.9854 14.166 10.8803 14.3514 10.6949C14.5368 10.5095 14.642 10.2586 14.6442 9.99645C14.6465 9.73425 14.5457 9.48165 14.3636 9.29305L8.70656 3.63605C8.51903 3.44858 8.26472 3.34326 7.99956 3.34326C7.7344 3.34326 7.48009 3.44858 7.29256 3.63605L1.63556 9.29305C1.44809 9.48058 1.34277 9.73488 1.34277 10C1.34277 10.2652 1.44809 10.5195 1.63556 10.707Z"
                    fill="black"
                  />
                </svg>
              </div>
            </button>
            <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton1">
              <li>
                <a href="/user-profile" className="dropdown-item">
                  View Profile
                </a>
              </li>
              <li>
                <a href="/schemes-status" className="dropdown-item">
                  Schemes
                </a>
              </li>
              <li>
                <a
                  className="dropdown-item"
                  data-bs-toggle="modal"
                  data-bs-target="#logoutModal"
                  style={{ cursor: "pointer" }}
                >
                  Logout
                </a>
              </li>
            </ul>
          </div>
        )}
        <button className="btn-menu d-md-none ms-2" onClick={toggleNavbar}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 18C3.71667 18 3.47934 17.904 3.288 17.712C3.09667 17.52 3.00067 17.2827 3 17C2.99934 16.7173 3.09534 16.48 3.288 16.288C3.48067 16.096 3.718 16 4 16H20C20.2833 16 20.521 16.096 20.713 16.288C20.905 16.48 21.0007 16.7173 21 17C20.9993 17.2827 20.9033 17.5203 20.712 17.713C20.5207 17.9057 20.2833 18.0013 20 18H4ZM4 13C3.71667 13 3.47934 12.904 3.288 12.712C3.09667 12.52 3.00067 12.2827 3 12C2.99934 11.7173 3.09534 11.48 3.288 11.288C3.48067 11.096 3.718 11 4 11H20C20.2833 11 20.521 11.096 20.713 11.288C20.905 11.48 21.0007 11.7173 21 12C20.9993 12.2827 20.9033 12.5203 20.712 12.713C20.5207 12.9057 20.2833 13.0013 20 13H4ZM4 8C3.71667 8 3.47934 7.904 3.288 7.712C3.09667 7.52 3.00067 7.28267 3 7C2.99934 6.71733 3.09534 6.48 3.288 6.288C3.48067 6.096 3.718 6 4 6H20C20.2833 6 20.521 6.096 20.713 6.288C20.905 6.48 21.0007 6.71733 21 7C20.9993 7.28267 20.9033 7.52033 20.712 7.713C20.5207 7.90567 20.2833 8.00133 20 8H4Z"
              fill="black"
            />
          </svg>
        </button>
      </div>

      <div
        className="modal fade"
        id="logoutModal"
        aria-labelledby="logoutModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-end mb-3">
                <a
                  type="button"
                  data-bs-dismiss="modal"
                  style={{ cursor: "pointer" }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.5 9.5L9.5 22.5M9.5 9.5L22.5 22.5"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
              <h3>Are you sure you want to logout from your account?</h3>
              {logoutError && (
                <div className="alert alert-danger mt-3" role="alert">
                  {logoutError}
                </div>
              )}
              <div className="text-right mt-3">
                <button
                  className="btn btn-outline-primary me-2 px-3"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Yes"}
                </button>
                <button
                  className="btn btn-primary px-3"
                  data-bs-dismiss="modal"
                  disabled={isLoggingOut}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
