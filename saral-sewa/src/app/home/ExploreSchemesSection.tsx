"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import SchemeFilter from "./SchemeFilter";

// Define the Scheme type
interface SchemeCategory {
  label: string;
}

interface SchemeState {
  label: string;
}

interface SchemeContent {
  briefDescription?: string;
  detailedDescription_md?: string;
}

interface Scheme {
  _id: string;
  slug: string;
  schemeName: string;
  schemeCategory: SchemeCategory[];
  state: SchemeState;
  tags: string[];
  schemeContent?: SchemeContent;
  schemeImageUrl?: string;
  nodalDepartmentName?: string;
}

export default function ExploreSchemesSection() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSchemes, setTotalSchemes] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const schemesPerPage = 12;

  // Filter state and toggle function
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const toggleFilter = (filterName: string) => {
    setActiveFilter((prev) => (prev === filterName ? null : filterName));
  };

  // FIXED: Safe text rendering function
  const safeRenderText = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    
    if (Array.isArray(value)) {
      return value.map(item => safeRenderText(item)).filter(Boolean).join(", ");
    }
    
    if (typeof value === "object" && value !== null) {
      if (value.label !== undefined) {
        return String(value.label);
      }
      if (value.value !== undefined) {
        return String(value.value);
      }
      if (value.name !== undefined) {
        return String(value.name);
      }
      return "";
    }
    
    return String(value);
  };

  // Fetch schemes from your API with pagination and sorting
  const fetchSchemes = async (page = 1, reset = false) => {
    try {
      setLoading(true);
      const skip = (page - 1) * schemesPerPage;
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

      const apiUrl = `${API_BASE_URL}/schemes?skip=${skip}&limit=${schemesPerPage}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch schemes");
      }

      const responseData = await response.json();
      console.log("API Response:", responseData);

      if (responseData.status !== 1) {
        throw new Error(responseData.message || "Failed to fetch schemes");
      }

      let data: Scheme[] = responseData.data || [];

      // FIXED: Process schemes to ensure safe rendering
      data = data.map(scheme => ({
        ...scheme,
        schemeName: safeRenderText(scheme.schemeName) || "Untitled Scheme",
        state: {
          label: safeRenderText(scheme.state)
        },
        schemeCategory: Array.isArray(scheme.schemeCategory) 
          ? scheme.schemeCategory.map(cat => ({
              label: safeRenderText(cat)
            }))
          : [],
        schemeContent: scheme.schemeContent ? {
          ...scheme.schemeContent,
          briefDescription: safeRenderText(scheme.schemeContent.briefDescription)
        } : undefined,
        nodalDepartmentName: safeRenderText(scheme.nodalDepartmentName),
        tags: Array.isArray(scheme.tags) 
          ? scheme.tags.map(tag => safeRenderText(tag))
          : []
      }));

      data = sortSchemes(data);

      if (reset || page === 1) {
        setSchemes(data);
      } else {
        setSchemes((prev) => [...prev, ...data]);
      }

      setTotalSchemes(data.length);
      setHasMore(responseData.data && responseData.data.length === schemesPerPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Load more schemes (pagination)
  const loadMoreSchemes = () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchSchemes(nextPage, false);
    }
  };

  useEffect(() => {
    fetchSchemes(1, true);
  }, []);

  // Function to get scheme image with backend URL priority and stable fallback
  const getSchemeImage = (scheme: Scheme): string => {
    if (scheme.schemeContent?.schemeImageUrl) {
      return scheme.schemeContent.schemeImageUrl;
    }

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
      !scheme.schemeCategory ||
      !Array.isArray(scheme.schemeCategory) ||
      scheme.schemeCategory.length === 0
    ) {
      return getConsistentDefaultImage(scheme._id);
    }

    for (const categoryObj of scheme.schemeCategory) {
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

    return getConsistentDefaultImage(scheme._id);
  };

  // Function to sort schemes by state
  const sortSchemes = (schemes: Scheme[]): Scheme[] => {
    const sortedSchemes = [...schemes];
    return sortedSchemes.sort((a, b) => {
      const stateA = a.state?.label || "";
      const stateB = b.state?.label || "";
      return stateA.localeCompare(stateB);
    });
  };

  const filteredAndSortedSchemes = schemes;

  if (loading) {
    return (
      <section className="explore-scheme">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "200px" }}
        >
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="explore-scheme">
        <div className="alert alert-danger" role="alert">
          Error loading schemes: {error}
        </div>
      </section>
    );
  }

  return (
    <section className="explore-scheme">
      <SchemeFilter activeFilter={activeFilter} toggleFilter={toggleFilter} />

      <div className="tab-content">
        <div className="tab-pane active" role="tabpanel">
          <div className="container-fluid">
            <div className="row">
              {filteredAndSortedSchemes.length === 0 ? (
                <div className="col-12 text-center py-5">
                  <p>No schemes found.</p>
                </div>
              ) : (
                filteredAndSortedSchemes.map((scheme) => {
                  return (
                    <div
                      key={scheme._id}
                      className="col-md-6 col-lg-4 col-xl-3 mb-4"
                    >
                      <div
                        className="scheme-card"
                        onClick={() =>
                          (window.location.href = `/scheme-detail?slug=${scheme.slug}`)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <Image
                          src={getSchemeImage(scheme)}
                          width={99999}
                          height={99999}
                          alt={scheme.schemeName || "Scheme"}
                        />
                        <div className="scheme-text">
                          <p
                            className="scheme-title"
                            title={scheme.schemeName}
                          >
                            {scheme.schemeName}
                          </p>
                          <p
                            className="scheme-desc"
                            title={scheme?.schemeContent?.briefDescription || ""}
                          >
                            {scheme?.schemeContent?.briefDescription || ""}
                          </p>
                          <div className="d-flex flex-column justify-content-between mb-2 flex-wrap">
                            <div className="d-flex mb-1">
                              <svg
                                className="me-2"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.26665 3.17338C5.2602 2.19971 6.59785 1.65747 7.98894 1.6645C9.38003 1.67152 10.7121 2.22725 11.6958 3.2109C12.6795 4.19456 13.2352 5.52668 13.2422 6.91776C13.2492 8.30885 12.707 9.6465 11.7333 10.64L8.94265 13.4307C8.69262 13.6807 8.35354 13.8211 7.99999 13.8211C7.64643 13.8211 7.30736 13.6807 7.05732 13.4307L4.26665 10.64C3.27658 9.64987 2.72037 8.30697 2.72037 6.90672C2.72037 5.50647 3.27658 4.16356 4.26665 3.17338Z"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 8.90674C9.10457 8.90674 10 8.01131 10 6.90674C10 5.80217 9.10457 4.90674 8 4.90674C6.89543 4.90674 6 5.80217 6 6.90674C6 8.01131 6.89543 8.90674 8 8.90674Z"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span className="scheme-place">
                                {scheme.state?.label || "Location"}
                              </span>
                            </div>
                            <div className="d-flex flex-wrap align-items-center mt-2">
                              <span className="badge-cat">
                                {scheme.schemeCategory?.[0]?.label || "N/A"}
                              </span>
                              <span className="badge-cat ms-2">
                                {scheme.state?.label || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button
            className="btn btn-primary btn-lg"
            onClick={loadMoreSchemes}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </section>
  );
}