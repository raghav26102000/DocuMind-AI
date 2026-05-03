"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { tokenManager } from "../utils/auth"; // Adjust the import path as needed
import "./scheme-status.css";

interface Application {
  application_id: string;
  scheme_slug: string;
  status: string;
  updated_at: string | null;
  scheme: {
    _id: string;
    schemeName: string;
    level: string;
    state: string;
  } | null;
}

interface ApiResponse {
  status: number;
  message: string;
  data: Application[];
  tag: string;
}

export default function SchemeStatusPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = tokenManager.getToken();
        const isValid = token ? tokenManager.isValidToken(token) : false;

        console.log("Auth check:", {
          hasToken: !!token,
          isValid,
          token: token?.substring(0, 20) + "...",
        });

        setIsAuthenticated(isValid);

        // If authenticated, fetch applications
        if (isValid) {
          await fetchApplications();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => {
      console.log("Auth state changed, rechecking...");
      checkAuth();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("authStateChange", handleAuthChange);
      window.addEventListener("storage", handleAuthChange);

      return () => {
        window.removeEventListener("authStateChange", handleAuthChange);
        window.removeEventListener("storage", handleAuthChange);
      };
    }
  }, []);

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      setError(null);

      const token = tokenManager.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/applications/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch applications: ${response.status} ${response.statusText}`
        );
      }

      const result: ApiResponse = await response.json();

      if (result.status === 1) {
        // Normalize the data to ensure status is always a string
        const normalizedApps = (result.data || []).map(app => ({
          ...app,
          status: typeof app.status === 'string' ? app.status : String(app.status || '')
        }));
        setApplications(normalizedApps);
      } else {
        throw new Error(result.message || "Failed to fetch applications");
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch applications"
      );
    } finally {
      setLoadingApplications(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusStr = typeof status === 'string' ? status : String(status || '');
    switch (statusStr?.toLowerCase()) {
      case "submitted":
        return "success";
      case "in_progress":
      case "in progress":
        return "warning";
      case "approved":
        return "primary";
      case "rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    const statusStr = typeof status === 'string' ? status : String(status || '');
    switch (statusStr?.toLowerCase()) {
      case "submitted":
        return (
          <svg
            className="me-2"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.125 13.125L9.375 18.375L19.875 7.125"
              stroke="#17B042"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "in_progress":
      case "in progress":
        return (
          <svg
            className="me-2"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
              stroke="#FFA500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleContinueApplication = async (application: Application) => {
    try {
      setLoadingApplications(true);
      setError(null);

      const token = tokenManager.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("=== Starting application continuation ===");
      console.log("Scheme slug:", application.scheme_slug);

      // Call the /applications/start endpoint to resume the application
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/applications/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheme_slug: application.scheme_slug,
          }),
        }
      );

      console.log("API Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to start application: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("API Success Response:", result);

      if (result.status === 1) {
        const applicationId = result.data.application_id;
        console.log("Application resumed successfully, ID:", applicationId);

        // Redirect to the scheme detail page with application continuation parameters
        const redirectUrl = `/scheme-detail?slug=${application.scheme_slug}`;
        console.log("Redirecting to:", redirectUrl);

        window.location.href = redirectUrl;
      } else {
        throw new Error(result.message || "Failed to start application");
      }
    } catch (error) {
      console.error("Error continuing application:", error);
      setError(
        `Failed to continue application: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoadingApplications(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const renderStatusBadge = (status: string) => {
    const statusStr = typeof status === 'string' ? status : String(status || '');
    const displayText = statusStr ? statusStr.replace(/_/g, " ").toUpperCase() : "UNKNOWN";
    return (
      <span className={`badge bg-${getStatusBadgeColor(statusStr)}`}>
        {displayText}
      </span>
    );
  };

  // Don't render anything on server
  if (!mounted) {
    return null;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    console.log("User not authenticated, hiding scheme status");
    return null;
  }

  console.log("Rendering scheme status for authenticated user");

  return (
    <section>
      <div className="d-flex pb-5">
        <a href="/home" className="btn" style={{ fontSize: "24px" }}>
          <svg
            className="me-2"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.0004 10.9999H7.83041L12.7104 6.11991C13.1004 5.72991 13.1004 5.08991 12.7104 4.69991C12.6179 4.60721 12.508 4.53366 12.387 4.48348C12.2661 4.4333 12.1364 4.40747 12.0054 4.40747C11.8744 4.40747 11.7448 4.4333 11.6238 4.48348C11.5028 4.53366 11.3929 4.60721 11.3004 4.69991L4.71041 11.2899C4.61771 11.3824 4.54416 11.4923 4.49398 11.6133C4.4438 11.7343 4.41797 11.8639 4.41797 11.9949C4.41797 12.1259 4.4438 12.2556 4.49398 12.3765C4.54416 12.4975 4.61771 12.6074 4.71041 12.6999L11.3004 19.2899C11.393 19.3825 11.5029 19.4559 11.6239 19.506C11.7448 19.5561 11.8745 19.5819 12.0054 19.5819C12.1363 19.5819 12.266 19.5561 12.387 19.506C12.5079 19.4559 12.6178 19.3825 12.7104 19.2899C12.803 19.1973 12.8764 19.0874 12.9265 18.9665C12.9766 18.8455 13.0024 18.7158 13.0024 18.5849C13.0024 18.454 12.9766 18.3243 12.9265 18.2034C12.8764 18.0824 12.803 17.9725 12.7104 17.8799L7.83041 12.9999H19.0004C19.5504 12.9999 20.0004 12.5499 20.0004 11.9999C20.0004 11.4499 19.5504 10.9999 19.0004 10.9999Z"
              fill="black"
            />
          </svg>
          Back
        </a>
      </div>

      <h1 className="page-heading">Your Schemes Status</h1>
      <h3 className="page-subheading">
        Please ensure all your schemes are up to date
      </h3>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
          <button
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={fetchApplications}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loadingApplications && (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading applications...</span>
          </div>
          <p className="mt-2 text-muted">Loading your applications...</p>
        </div>
      )}

      {/* No Applications State */}
      {!loadingApplications && !error && applications.length === 0 && (
        <div className="alert alert-info text-center" role="alert">
          <h4>No Applications Found</h4>
          <p>You haven&apos;t applied to any schemes yet.</p>
          <a href="/home" className="btn btn-primary">
            Browse Schemes
          </a>
        </div>
      )}

      {/* Current Scheme Section */}
      {!loadingApplications && !error && applications.length > 0 && (
        <>
          {(() => {
            // Find the first in-progress application for "Current Scheme"
            const inProgressApp = applications.find(
              (app) =>
                app.status?.toLowerCase() === "in_progress" ||
                app.status?.toLowerCase() === "in progress"
            );

            if (inProgressApp) {
              return (
                <>
                  <div className="scheme-status current-scheme-status mb-5">
                    <div className="status-ribbon">Current Scheme</div>

                    <div className="d-flex scheme-info align-items-center mb-4">
                      <Image
                        src="/imgs/current-scheme-img.png"
                        alt="Scheme"
                        width={9999}
                        height={99999}
                      />
                      <div className="d-flex flex-column me-2">
                        <h2 className="pe-4">
                          {inProgressApp.scheme?.schemeName ||
                            "Government Scheme"}
                        </h2>
                        <div className="d-flex align-items-center flex-wrap">
                          <span className="me-4">
                            <svg
                              className="me-2"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M6.40048 4.76001C7.8908 3.2995 9.89729 2.48614 11.9839 2.49668C14.0705 2.50722 16.0687 3.34081 17.5442 4.8163C19.0197 6.29179 19.8533 8.28995 19.8638 10.3766C19.8744 12.4632 19.061 14.4697 17.6005 15.96L13.4145 20.146C13.0394 20.521 12.5308 20.7316 12.0005 20.7316C11.4702 20.7316 10.9615 20.521 10.5865 20.146L6.40048 15.96C4.91537 14.4748 4.08105 12.4604 4.08105 10.36C4.08105 8.25964 4.91537 6.24528 6.40048 4.76001Z"
                                stroke="black"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 13.3601C13.6569 13.3601 15 12.017 15 10.3601C15 8.70325 13.6569 7.36011 12 7.36011C10.3431 7.36011 9 8.70325 9 10.3601C9 12.017 10.3431 13.3601 12 13.3601Z"
                                stroke="black"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {inProgressApp.scheme?.state?.label || "N/A"}
                          </span>
                          <span>
                            <svg
                              className="me-2"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M4 9V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V9M4 9V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H8M4 9H20M20 9V7C20 6.46957 19.7893 5.96086 19.4142 5.58579C19.0391 5.21071 18.5304 5 18 5H16M8 5H16M8 5V3M16 5V3"
                                stroke="black"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Last Updated: {formatDate(inProgressApp.updated_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary p-3 ms-auto text-nowrap"
                        onClick={() => handleContinueApplication(inProgressApp)}
                        disabled={loadingApplications}
                      >
                        {loadingApplications ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Continuing...
                          </>
                        ) : (
                          "Continue Application"
                        )}
                      </button>
                    </div>
                    <div className="scheme-action">
                      {getStatusIcon(inProgressApp.status)}
                      Your application is in progress. Please complete all
                      required documents to submit.
                    </div>
                  </div>

                  {/* Other Applications Section */}
                  {applications.filter(
                    (app) =>
                      app.status?.toLowerCase() !== "in_progress" &&
                      app.status?.toLowerCase() !== "in progress"
                  ).length > 0 && (
                    <>
                      <h3 className="page-subheading mb-4 mt-5">
                        Previous Applications
                      </h3>
                      {applications
                        .filter(
                          (app) =>
                            app.status?.toLowerCase() !== "in_progress" &&
                            app.status?.toLowerCase() !== "in progress"
                        )
                        .map((application) => (
                          <div
                            key={application.application_id}
                            className="scheme-status mb-4"
                          >
                            <div className="d-flex scheme-info align-items-center mb-4">
                              <Image
                                src="/imgs/current-scheme-img.png"
                                alt="Scheme"
                                width={9999}
                                height={99999}
                              />
                              <div className="d-flex flex-column me-2">
                                <h2 className="pe-4">
                                  {application.scheme?.schemeName ||
                                    "Government Scheme"}
                                </h2>
                                <div className="d-flex align-items-center flex-wrap">
                                  <span className="me-4">
                                    <svg
                                      className="me-2"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M6.40048 4.76001C7.8908 3.2995 9.89729 2.48614 11.9839 2.49668C14.0705 2.50722 16.0687 3.34081 17.5442 4.8163C19.0197 6.29179 19.8533 8.28995 19.8638 10.3766C19.8744 12.4632 19.061 14.4697 17.6005 15.96L13.4145 20.146C13.0394 20.521 12.5308 20.7316 12.0005 20.7316C11.4702 20.7316 10.9615 20.521 10.5865 20.146L6.40048 15.96C4.91537 14.4748 4.08105 12.4604 4.08105 10.36C4.08105 8.25964 4.91537 6.24528 6.40048 4.76001Z"
                                        stroke="black"
                                        strokeWidth="1.5"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M12 13.3601C13.6569 13.3601 15 12.017 15 10.3601C15 8.70325 13.6569 7.36011 12 7.36011C10.3431 7.36011 9 8.70325 9 10.3601C9 12.017 10.3431 13.3601 12 13.3601Z"
                                        stroke="black"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    {application.scheme?.state?.label || "N/A"}
                                  </span>
                                  <span className="me-4">
                                    <svg
                                      className="me-2"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M4 9V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V9M4 9V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H8M4 9H20M20 9V7C20 6.46957 19.7893 5.96086 19.4142 5.58579C19.0391 5.21071 18.5304 5 18 5H16M8 5H16M8 5V3M16 5V3"
                                        stroke="black"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    Last Updated:{" "}
                                    {formatDate(application.updated_at)}
                                  </span>
                                  {renderStatusBadge(application.status)}
                                </div>
                              </div>
                              <button
                                className="btn btn-outline-secondary p-3 ms-auto text-nowrap"
                                onClick={() =>
                                  (window.location.href = `/scheme/${application.scheme_slug}`)
                                }
                              >
                                View Details
                              </button>
                            </div>
                            <div
                              className="scheme-action"
                              style={{
                                borderColor:
                                  application.status?.toLowerCase() ===
                                  "submitted"
                                    ? "#17B042"
                                    : application.status?.toLowerCase() ===
                                      "approved"
                                    ? "#17B042"
                                    : "#FFA500",
                              }}
                            >
                              {getStatusIcon(application.status)}
                              {application.status?.toLowerCase() === "submitted"
                                ? "Your application has been submitted successfully. Our team will get in touch with you."
                                : application.status?.toLowerCase() ===
                                  "approved"
                                ? "Congratulations! Your application has been approved."
                                : application.status?.toLowerCase() ===
                                  "rejected"
                                ? "Your application was not approved. You may contact support for more information."
                                : `Application status: ${
                                    application.status || "Unknown"
                                  }`}
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                </>
              );
            } else {
              // No in-progress applications, show all as "Previous Applications"
              return (
                <>
                  <h3 className="page-subheading mb-4">Your Applications</h3>
                  {applications.map((application) => (
                    <div
                      key={application.application_id}
                      className="scheme-status mb-4"
                    >
                      <div className="d-flex scheme-info align-items-center mb-4">
                        <Image
                          src="/imgs/current-scheme-img.png"
                          alt="Scheme"
                          width={9999}
                          height={99999}
                        />
                        <div className="d-flex flex-column me-2">
                          <h2 className="pe-4">
                            {application.scheme?.schemeName ||
                              "Government Scheme"}
                          </h2>
                          <div className="d-flex align-items-center flex-wrap">
                            <span className="me-4">
                              <svg
                                className="me-2"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M6.40048 4.76001C7.8908 3.2995 9.89729 2.48614 11.9839 2.49668C14.0705 2.50722 16.0687 3.34081 17.5442 4.8163C19.0197 6.29179 19.8533 8.28995 19.8638 10.3766C19.8744 12.4632 19.061 14.4697 17.6005 15.96L13.4145 20.146C13.0394 20.521 12.5308 20.7316 12.0005 20.7316C11.4702 20.7316 10.9615 20.521 10.5865 20.146L6.40048 15.96C4.91537 14.4748 4.08105 12.4604 4.08105 10.36C4.08105 8.25964 4.91537 6.24528 6.40048 4.76001Z"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12 13.3601C13.6569 13.3601 15 12.017 15 10.3601C15 8.70325 13.6569 7.36011 12 7.36011C10.3431 7.36011 9 8.70325 9 10.3601C9 12.017 10.3431 13.3601 12 13.3601Z"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {application.scheme?.state?.label || "N/A"}
                            </span>
                            <span className="me-4">
                              <svg
                                className="me-2"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4 9V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V9M4 9V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H8M4 9H20M20 9V7C20 6.46957 19.7893 5.96086 19.4142 5.58579C19.0391 5.21071 18.5304 5 18 5H16M8 5H16M8 5V3M16 5V3"
                                  stroke="black"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Last Updated: {formatDate(application.updated_at)}
                            </span>
                            {renderStatusBadge(application.status)}
                          </div>
                        </div>
                        <button
                          className="btn btn-outline-secondary p-3 ms-auto text-nowrap"
                          onClick={() =>
                            (window.location.href = `/scheme/${application.scheme_slug}`)
                          }
                        >
                          View Details
                        </button>
                      </div>
                      <div
                        className="scheme-action"
                        style={{
                          borderColor:
                            application.status?.toLowerCase() === "submitted"
                              ? "#17B042"
                              : application.status?.toLowerCase() === "approved"
                              ? "#17B042"
                              : "#FFA500",
                        }}
                      >
                        {getStatusIcon(application.status)}
                        {application.status?.toLowerCase() === "submitted"
                          ? "Your application has been submitted successfully. Our team will get in touch with you."
                          : application.status?.toLowerCase() === "approved"
                          ? "Congratulations! Your application has been approved."
                          : application.status?.toLowerCase() === "rejected"
                          ? "Your application was not approved. You may contact support for more information."
                          : `Application status: ${
                              application.status || "Unknown"
                            }`}
                      </div>
                    </div>
                  ))}
                </>
              );
            }
          })()}
        </>
      )}

      {/* Refresh Button */}
      {!loadingApplications && (
        <div className="text-center mt-4">
          <button
            className="btn btn-outline-primary"
            onClick={fetchApplications}
          >
            <svg
              className="me-2"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh Applications
          </button>
        </div>
      )}
    </section>
  );
}