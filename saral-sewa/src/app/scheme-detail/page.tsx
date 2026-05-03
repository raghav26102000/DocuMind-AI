// src/app/scheme/[slug]/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import "./scheme-info.css";
import DetailPage from "./detailSection";
import FeedbackPage from "./feedbackSection";
import SourcesPage from "./sourcesSection";
import DocumentRequiredPage from "./documentRequiredSection";
import ApplicationProcessPage from "./applicationProcessSection";
import EligibilityPage from "./eligibilitySection";
import BenefitsPage from "./benefitsSection";
import FaqPage from "./faqSection";
import SchemeEligibilityAndApply from "./SchemeEligibilityAndApply";

// Loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="scheme-info-wrapper">
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "50vh" }}
      >
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );
}

// Extract the component that uses useSearchParams into a separate component
function SchemeDetailContent() {
  const [schemeData, setSchemeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  useEffect(() => {
    const fetchSchemeData = async () => {
      if (!slug) {
        setError("No scheme slug provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/schemes/${slug}`
        );
        console.log("Slug from searchParams:", slug);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log("API Response:", responseData);

        // Check if the API response indicates success
        if (responseData.status !== 1) {
          throw new Error(responseData.message || "Failed to fetch scheme details");
        }

        // Extract the actual scheme data from the response
        setSchemeData(responseData.data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching scheme data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchemeData();
  }, [slug]);

  if (loading) {
    return (
      <div className="scheme-info-wrapper">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "50vh" }}
        >
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scheme-info-wrapper">
        <div className="alert alert-danger" role="alert">
          Error loading scheme details: {error}
        </div>
      </div>
    );
  }

  if (!schemeData) {
    return (
      <div className="scheme-info-wrapper">
        <div className="alert alert-warning" role="alert">
          Scheme not found
        </div>
      </div>
    );
  }

  return (
    <div className="scheme-info-wrapper">
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
            </svg>{" "}
            Back
          </a>
        </div>
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-3 col-md-4">
              <ul
                className="nav nav-pills scheme-menu-wrapper"
                id="myTab"
                role="tablist"
              >
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link active"
                    id="scheme-detail-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-detail"
                    type="button"
                    role="tab"
                    aria-controls="scheme-detail"
                    aria-selected="true"
                  >
                    Details
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-benefits-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-benefits"
                    type="button"
                    role="tab"
                    aria-controls="scheme-benefits"
                    aria-selected="false"
                  >
                    Benefits
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-eligibility-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-eligibility"
                    type="button"
                    role="tab"
                    aria-controls="scheme-eligibility"
                    aria-selected="false"
                  >
                    Eligibility
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-application-process-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-application-process"
                    type="button"
                    role="tab"
                    aria-controls="scheme-application-process"
                    aria-selected="false"
                  >
                    Application Process
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-document-required-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-document-required"
                    type="button"
                    role="tab"
                    aria-controls="scheme-document-required"
                    aria-selected="false"
                  >
                    Document Required
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-faq-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-faq"
                    type="button"
                    role="tab"
                    aria-controls="scheme-faq"
                    aria-selected="false"
                  >
                    Frequently Asked Questions
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-source-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-source"
                    type="button"
                    role="tab"
                    aria-controls="scheme-source"
                    aria-selected="false"
                  >
                    Sources And References
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="scheme-feedback-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#scheme-feedback"
                    type="button"
                    role="tab"
                    aria-controls="scheme-feedback"
                    aria-selected="false"
                  >
                    Feedback
                  </button>
                </li>
              </ul>
            </div>
            <div className="col-lg-9 col-md-8 py-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="scheme-name me-2">
                  {schemeData.nodalDepartmentName?.label ||
                    "Government Department"}
                </h1>
                <a type="button">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17 22C16.1667 22 15.4583 21.7083 14.875 21.125C14.2917 20.5417 14 19.8333 14 19C14 18.9 14.025 18.6667 14.075 18.3L7.05 14.2C6.78333 14.45 6.475 14.646 6.125 14.788C5.775 14.93 5.4 15.0007 5 15C4.16667 15 3.45833 14.7083 2.875 14.125C2.29167 13.5417 2 12.8333 2 12C2 11.1667 2.29167 10.4583 2.875 9.875C3.45833 9.29167 4.16667 9 5 9C5.4 9 5.775 9.071 6.125 9.213C6.475 9.355 6.78333 9.55067 7.05 9.8L14.075 5.7C14.0417 5.58333 14.021 5.471 14.013 5.363C14.005 5.255 14.0007 5.134 14 5C14 4.16667 14.2917 3.45833 14.875 2.875C15.4583 2.29167 16.1667 2 17 2C17.8333 2 18.5417 2.29167 19.125 2.875C19.7083 3.45833 20 4.16667 20 5C20 5.83333 19.7083 6.54167 19.125 7.125C18.5417 7.70833 17.8333 8 17 8C16.6 8 16.225 7.929 15.875 7.787C15.525 7.645 15.2167 7.44933 14.95 7.2L7.925 11.3C7.95833 11.4167 7.97933 11.5293 7.988 11.638C7.99667 11.7467 8.00067 11.8673 8 12C7.99933 12.1327 7.99533 12.2537 7.988 12.363C7.98067 12.4723 7.95967 12.5847 7.925 12.7L14.95 16.8C15.2167 16.55 15.525 16.3543 15.875 16.213C16.225 16.0717 16.6 16.0007 17 16C17.8333 16 18.5417 16.2917 19.125 16.875C19.7083 17.4583 20 18.1667 20 19C20 19.8333 19.7083 20.5417 19.125 21.125C18.5417 21.7083 17.8333 22 17 22Z"
                      fill="black"
                    />
                  </svg>
                </a>
              </div>
              <h2 className="mb-4">{schemeData.schemeName || "Scheme Name"}</h2>
              <div className="d-flex flex-wrap mb-4">
                {schemeData.tags &&
                  schemeData.tags.map((tag, index) => (
                    <div key={index} className="scheme-tag">
                      {tag}
                    </div>
                  ))}
              </div>
              {/* Render the new eligibility and apply component */}
              <SchemeEligibilityAndApply schemeData={schemeData} slug={slug} />
              
              <div className="tab-content">
                <div
                  className="tab-pane active"
                  id="scheme-detail"
                  role="tabpanel"
                  aria-labelledby="scheme-detail-tab"
                >
                  <DetailPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-benefits"
                  role="tabpanel"
                  aria-labelledby="scheme-benefits-tab"
                >
                  <BenefitsPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-eligibility"
                  role="tabpanel"
                  aria-labelledby="scheme-eligibility-tab"
                >
                  <EligibilityPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-application-process"
                  role="tabpanel"
                  aria-labelledby="scheme-application-process-tab"
                >
                  <ApplicationProcessPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-document-required"
                  role="tabpanel"
                  aria-labelledby="scheme-document-required-tab"
                >
                  <DocumentRequiredPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-faq"
                  role="tabpanel"
                  aria-labelledby="scheme-faq-tab"
                >
                  <FaqPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-source"
                  role="tabpanel"
                  aria-labelledby="scheme-source-tab"
                >
                  <SourcesPage schemeData={schemeData} />
                </div>
                <div
                  className="tab-pane"
                  id="scheme-feedback"
                  role="tabpanel"
                  aria-labelledby="scheme-feedback-tab"
                >
                  <FeedbackPage schemeData={schemeData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Main component that wraps the content in Suspense
export default function SchemeDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SchemeDetailContent />
    </Suspense>
  );
}