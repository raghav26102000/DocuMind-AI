"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "../utils/auth";
import { tokenManager } from "../utils/auth";

interface SchemeCategory {
  label: string;
}

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

// Function to get scheme image based on category with stable fallback
const getSchemeImage = (
  schemeCategories: SchemeCategory[],
  schemeId: string
): string => {
  const categoryImages: Record<string, string> = {
    Finance: "/imgs/finance-scheme-img.png",
    Education: "/imgs/education-scheme-img.png",
    "Business & Entrepreneurship": "/imgs/business-scheme-img.png",
    Travel: "/imgs/travel-scheme-img.png",
    Agriculture: "/imgs/agriculture-scheme-img.png",
    Healthcare: "/imgs/healthcare-scheme-img.png",
  };

  const defaultImages = [
    "/imgs/finance-scheme-img.png",
    "/imgs/education-scheme-img.png",
    "/imgs/business-scheme-img.png",
    "/imgs/travel-scheme-img.png",
    "/imgs/agriculture-scheme-img.png",
    "/imgs/healthcare-scheme-img.png",
  ];

  const getConsistentDefaultImage = (id: string): string => {
    if (!id) return defaultImages[0];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const index = Math.abs(hash) % defaultImages.length;
    return defaultImages[index];
  };

  if (
    !schemeCategories ||
    !Array.isArray(schemeCategories) ||
    schemeCategories.length === 0
  ) {
    return getConsistentDefaultImage(schemeId);
  }

  for (const categoryObj of schemeCategories) {
    const category = categoryObj?.label || "";
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes("finance") || categoryLower.includes("financial")) {
      return categoryImages.Finance;
    }
    if (categoryLower.includes("education") || categoryLower.includes("learning")) {
      return categoryImages.Education;
    }
    if (categoryLower.includes("business") || categoryLower.includes("entrepreneur")) {
      return categoryImages["Business & Entrepreneurship"];
    }
    if (categoryLower.includes("travel") || categoryLower.includes("tourism")) {
      return categoryImages.Travel;
    }
    if (categoryLower.includes("agriculture") || categoryLower.includes("farming")) {
      return categoryImages.Agriculture;
    }
    if (categoryLower.includes("health") || categoryLower.includes("medical") || categoryLower.includes("welfare")) {
      return categoryImages.Healthcare;
    }
  }

  return getConsistentDefaultImage(schemeId);
};

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const [loadingCurrentApp, setLoadingCurrentApp] = useState(false);

  const { isAuthenticated } = useAuth();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // BULLETPROOF: Absolutely safe text rendering
  const safeRenderText = (value: any): string => {
    try {
      if (value === null || value === undefined) {
        return "";
      }
      
      if (Array.isArray(value)) {
        const safeMapped = value
          .map(item => safeRenderText(item))
          .filter(item => typeof item === 'string' && item.trim() !== '');
        return safeMapped.join(", ");
      }
      
      if (typeof value === "object" && value !== null) {
        // Try all possible key variations
        const possibleKeys = ['label', 'value', 'name', 'title', 'text', 'description'];
        
        for (const key of possibleKeys) {
          if (value.hasOwnProperty(key) && value[key] !== null && value[key] !== undefined) {
            const nestedValue = value[key];
            if (typeof nestedValue === 'string') {
              return nestedValue;
            }
            if (typeof nestedValue === 'number') {
              return String(nestedValue);
            }
            if (typeof nestedValue === 'object') {
              return safeRenderText(nestedValue);
            }
          }
        }
        
        // Last resort - return empty string instead of object
        return "";
      }
      
      // For primitives, ensure string conversion
      return String(value);
    } catch (error) {
      console.error('Error in safeRenderText:', error, value);
      return "";
    }
  };

  // Fetch current application when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentApplication();
    }
  }, [isAuthenticated]);

  const fetchCurrentApplication = async () => {
    try {
      setLoadingCurrentApp(true);
      const token = tokenManager.getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/applications/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1 && result.data) {
          const inProgressApp = result.data.find(
            (app) =>
              app.status?.toLowerCase() === "in_progress" ||
              app.status?.toLowerCase() === "in progress"
          );
          setCurrentApplication(inProgressApp || null);
        }
      }
    } catch (error) {
      console.error("Error fetching current application:", error);
    } finally {
      setLoadingCurrentApp(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const handleContinueApplication = async (application: Application) => {
    try {
      setLoadingCurrentApp(true);
      setError("");

      const token = tokenManager.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/applications/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scheme_slug: application.scheme_slug,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start application: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 1) {
        const redirectUrl = `/scheme-detail?slug=${application.scheme_slug}`;
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
      setLoadingCurrentApp(false);
    }
  };

  // Debounced search function
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/schemes/search?q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log("Raw search response:", data);

      const results = Array.isArray(data)
        ? data
        : data.data && Array.isArray(data.data)
        ? data.data
        : data.results && Array.isArray(data.results)
        ? data.results
        : [];

      // BULLETPROOF: Pre-process all results to ensure safe rendering
      const processedResults = results.map((scheme, index) => {
        try {
          return {
            _id: scheme._id || scheme.id || `scheme-${index}`,
            slug: scheme.slug || scheme._id || scheme.id,
            schemeName: safeRenderText(scheme.schemeName) || "Untitled Scheme",
            state: safeRenderText(scheme.state) || "",
            schemeCategory: safeRenderText(scheme.schemeCategory) || "",
            nodalDepartmentName: safeRenderText(scheme.nodalDepartmentName) || "",
            briefDescription: scheme.schemeContent?.briefDescription ? 
              safeRenderText(scheme.schemeContent.briefDescription) : "",
            tags: Array.isArray(scheme.tags) ? 
              scheme.tags.map(tag => safeRenderText(tag)).filter(Boolean) : [],
            // Keep original for image function
            originalSchemeCategory: scheme.schemeCategory
          };
        } catch (error) {
          console.error('Error processing scheme:', error, scheme);
          return {
            _id: `error-scheme-${index}`,
            slug: `error-scheme-${index}`,
            schemeName: "Error loading scheme",
            state: "",
            schemeCategory: "",
            nodalDepartmentName: "",
            briefDescription: "",
            tags: [],
            originalSchemeCategory: null
          };
        }
      });

      setSearchResults(processedResults);
      setShowResults(true);
    } catch (err) {
      setError(`Error searching schemes: ${err.message}`);
      console.error("Search error:", err);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleResultClick = (scheme) => {
    const slug = scheme.slug;
    if (slug) {
      window.location.href = `/scheme-detail?slug=${slug}`;
    } else {
      console.error("No valid slug found for scheme:", scheme);
    }
  };

  // BULLETPROOF: Safe highlight function
  const highlightText = (text, query) => {
    try {
      if (!query || !text) return text;
      
      const textString = String(text);
      if (!textString.trim()) return textString;

      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      const parts = textString.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <span
            key={index}
            style={{ backgroundColor: "#fff3cd", fontWeight: "bold" }}
          >
            {part}
          </span>
        ) : (
          part
        )
      );
    } catch (error) {
      console.error("Error in highlightText:", error);
      return String(text);
    }
  };

  return (
    <section className="hero-section">
      <Image
        src="/imgs/hero-bg-1.png"
        className="hero-bg-1"
        alt=""
        width={100}
        height={100}
      />
      <Image
        src="/imgs/hero-bg-1.png"
        className="hero-bg-2"
        alt=""
        width={100}
        height={100}
      />

      {/* Current Application Status */}
      {isAuthenticated && !loadingCurrentApp && currentApplication && (
        <>
          {/* Desktop version */}
          <div className="current-scheme-status">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-5">
              <p>Your Current Scheme Status</p>
              <a href="/schemes-status" className="d-flex">
                View All Schemes
                <svg className="ms-2" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19.9707 12.9705H5.9707M19.9707 12.9705L13.9707 18.9705M19.9707 12.9705L13.9707 6.97046"
                    stroke="#2279E4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
            <div className="d-flex scheme-info align-items-center mb-4">
              <Image
                src="/imgs/current-scheme-img.png"
                alt="Current Scheme"
                width={100}
                height={100}
                style={{ objectFit: "cover" }}
              />
              <div className="d-flex flex-column me-2">
                <h2 className="pe-4">
                  {safeRenderText(currentApplication.scheme?.schemeName) || "Government Scheme"}
                </h2>
                <div className="d-flex align-items-center flex-wrap">
                  <span className="me-4">
                    <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                    </svg>{" "}
                    {safeRenderText(currentApplication.scheme?.state) || "N/A"}
                  </span>
                  <span>
                    <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 9V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V9M4 9V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H8M4 9H20M20 9V7C20 6.46957 19.7893 5.96086 19.4142 5.58579C19.0391 5.21071 18.5304 5 18 5H16M8 5H16M8 5V3M16 5V3"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Last Updated: {formatDate(currentApplication.updated_at)}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-primary p-3 ms-auto text-nowrap"
                onClick={() => handleContinueApplication(currentApplication)}
                disabled={loadingCurrentApp}
              >
                {loadingCurrentApp ? (
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
            <div className="current-scheme-action">
              Your application is in progress. Please complete all required documents to submit before the deadline.
            </div>
          </div>

          {/* Mobile version */}
          <div className="current-scheme-status md">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
              <p>Your Current Scheme Status</p>
            </div>
            <div className="d-flex scheme-info align-items-center mb-3">
              <Image
                src="/imgs/current-scheme-img.png"
                alt="Current Scheme"
                width={100}
                height={100}
                style={{ objectFit: "cover" }}
              />
              <div className="d-flex flex-column me-2">
                <h2 className="pe-4">
                  {safeRenderText(currentApplication.scheme?.schemeName) || "Government Scheme"}
                </h2>
              </div>
            </div>

            <div className="d-flex align-items-start w-100 flex-column mb-3">
              <span className="mb-2 me-2">
                <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                </svg>{" "}
                {safeRenderText(currentApplication.scheme?.state) || "N/A"}
              </span>
              <span>
                <svg className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 9V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V9M4 9V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H8M4 9H20M20 9V7C20 6.46957 19.7893 5.96086 19.4142 5.58579C19.0391 5.21071 18.5304 5 18 5H16M8 5H16M8 5V3M16 5V3"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Last Updated: {formatDate(currentApplication.updated_at)}
              </span>
            </div>
            <div className="current-scheme-action">
              Your application is in progress. Please complete all required documents to submit before the deadline.
            </div>
            <a href="/schemes-status" className="d-flex my-3">
              View All Schemes
              <svg className="ms-2" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M19.9707 12.9705H5.9707M19.9707 12.9705L13.9707 18.9705M19.9707 12.9705L13.9707 6.97046"
                  stroke="#2279E4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <button
              className="btn btn-primary p-3 text-nowrap"
              onClick={() => handleContinueApplication(currentApplication)}
              disabled={loadingCurrentApp}
            >
              {loadingCurrentApp ? (
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
        </>
      )}

      <div className="hero-text">
        <h1>Get Your Schemes on Time with Saral Sewa</h1>

        <div className="scheme-input-container" style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search for a Scheme"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearchSubmit(e)}
          />
          <div
            onClick={handleSearchSubmit}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
          >
            {isLoading ? (
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid #f3f3f3",
                  borderTop: "2px solid #2279E4",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15.5 14H14.71L14.43 13.73C15.444 12.5541 16.0012 11.0527 16 9.5C16 8.21442 15.6188 6.95772 14.9046 5.8888C14.1903 4.81988 13.1752 3.98676 11.9874 3.49479C10.7997 3.00282 9.49279 2.87409 8.23192 3.1249C6.97104 3.3757 5.81285 3.99477 4.90381 4.90381C3.99477 5.81285 3.3757 6.97104 3.1249 8.23192C2.87409 9.49279 3.00282 10.7997 3.49479 11.9874C3.98676 13.1752 4.81988 14.1903 5.8888 14.9046C6.95772 15.6188 8.21442 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z"
                  fill="black"
                />
              </svg>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="search-list-wrapper">
              {error && <div className="error">{error}</div>}

              {searchResults.length === 0 && !error && !isLoading && (
                <div className="no-data">
                  No schemes found for "{searchQuery}"
                </div>
              )}

              {searchResults.length > 0 &&
                searchResults.map((scheme, index) => (
                  <div
                    className="search-list-item"
                    key={scheme._id}
                    onClick={() => handleResultClick(scheme)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <Image
                        className="me-2 rounded-3"
                        src={getSchemeImage(scheme.originalSchemeCategory, scheme._id)}
                        alt=""
                        width="150"
                        height="120"
                      />
                      <div style={{ flex: 1 }}>
                        <h5>{highlightText(scheme.schemeName, searchQuery)}</h5>

                        {scheme.briefDescription && (
                          <p>{highlightText(scheme.briefDescription, searchQuery)}</p>
                        )}

                        <div className="d-flex flex-wrap" style={{ gap: "8px", fontSize: "0.8rem" }}>
                          {scheme.state && (
                            <span className="badge badge-state">📍 {scheme.state}</span>
                          )}

                          {scheme.schemeCategory && (
                            <span className="badge badge-category">{scheme.schemeCategory}</span>
                          )}
                          
                          {scheme.nodalDepartmentName && (
                            <span className="badge badge-department">{scheme.nodalDepartmentName}</span>
                          )}
                        </div>

                        {scheme.tags.length > 0 && (
                          <div className="d-flex flex-wrap mt-2" style={{ gap: "4px" }}>
                            {scheme.tags.slice(0, 3).map((tag, tagIndex) => (
                              <span key={tagIndex} className="badge badge-tag">
                                {tag}
                              </span>
                            ))}
                            {scheme.tags.length > 3 && (
                              <span className="badge badge-more-tag">
                                +{scheme.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ marginLeft: "16px", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="stats-wrapper">
          <div className="stat">
            <span className="stat-value">500+</span>
            <span className="stat-label">
              Government <br />
              Schemes
            </span>
          </div>
          <div className="stat">
            <span className="stat-value">50+</span>
            <span className="stat-label">
              Forms <br />
              Completed
            </span>
          </div>
          <div className="stat">
            <span className="stat-value">95%</span>
            <span className="stat-label">
              Success <br /> Rate
            </span>
          </div>
        </div>

        <button className="btn btn-primary">
          Eligibility-Based Finder
          <svg
            className="ms-3"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_719_3731)">
              <path
                d="M22.168 12.2549C22.3656 12.4525 22.4766 12.7206 22.4766 13C22.4766 13.2795 22.3656 13.5475 22.168 13.7451L16.2061 19.707C16.1089 19.8076 15.9926 19.8879 15.864 19.9432C15.7355 19.9984 15.5972 20.0275 15.4572 20.0287C15.3173 20.0299 15.1785 20.0032 15.049 19.9502C14.9195 19.8972 14.8018 19.819 14.7029 19.72C14.6039 19.6211 14.5257 19.5034 14.4727 19.3739C14.4197 19.2444 14.393 19.1056 14.3942 18.9657C14.3954 18.8257 14.4245 18.6874 14.4798 18.5589C14.535 18.4303 14.6153 18.314 14.7159 18.2168L18.8788 14.0539H4.92212C4.64261 14.0539 4.37455 13.9429 4.17691 13.7452C3.97926 13.5476 3.86823 13.2795 3.86823 13C3.86823 12.7205 3.97926 12.4524 4.17691 12.2548C4.37455 12.0572 4.64261 11.9461 4.92212 11.9461L18.8788 11.9461L14.7159 7.78325C14.524 7.58448 14.4177 7.31827 14.4201 7.04194C14.4225 6.76562 14.5334 6.50129 14.7288 6.30589C14.9242 6.11049 15.1885 5.99965 15.4648 5.99725C15.7412 5.99485 16.0074 6.10107 16.2061 6.29305L22.168 12.2549Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id="clip0_719_3731">
                <rect
                  width="25.2934"
                  height="25.2934"
                  fill="white"
                  transform="matrix(0 -1 -1 0 26 25.6467)"
                />
              </clipPath>
            </defs>
          </svg>
        </button>
      </div>

      {/* Overlay to close search results */}
      {showResults && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 40,
          }}
          onClick={() => setShowResults(false)}
        />
      )}

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}