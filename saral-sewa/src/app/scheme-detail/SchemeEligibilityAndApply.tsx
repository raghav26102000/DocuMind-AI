// Fixed SchemeEligibilityAndApply.tsx
"use client";

import { useState, useEffect } from "react";
import ApplicationWindow from "./applicationWindow";

interface SchemeEligibilityAndApplyProps {
  schemeData: any;
  slug: string;
}

const SchemeEligibilityAndApply: React.FC<SchemeEligibilityAndApplyProps> = ({
  schemeData,
  slug,
}) => {
  const [eligibilityQuestions, setEligibilityQuestions] = useState([]);
  const [eligibilityAnswers, setEligibilityAnswers] = useState([]);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  
  // Application states
  const [showApplicationWindow, setShowApplicationWindow] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);

  const getToken = () => {
    if (typeof window === "undefined") return "";
    
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      console.error("No access token found");
      return "";
    }
    
    const tokenExpiry = localStorage.getItem("token_expiry");
    if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
      console.error("Token has expired");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token_expiry");
      return "";
    }
    
    return token;
  };

  const fetchEligibilityQuestions = async () => {
    if (!slug || eligibilityQuestions.length > 0) return;

    setEligibilityLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/schemes/${slug}/eligibility-questions`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.status === 1) {
        const questions = responseData.data.questions || [];
        setEligibilityQuestions(questions);
        setEligibilityAnswers(new Array(questions.length).fill(null));
      }
    } catch (err) {
      console.error("Error fetching eligibility questions:", err);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, answer: boolean) => {
    const newAnswers = [...eligibilityAnswers];
    newAnswers[questionIndex] = answer;
    setEligibilityAnswers(newAnswers);
  };

  const submitEligibilityCheck = async () => {
    const hasUnanswered = eligibilityAnswers.some((answer) => answer === null);
    if (hasUnanswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setEligibilityLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/schemes/${slug}/eligibility-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: eligibilityAnswers,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.status === 1) {
        setEligibilityResult(responseData.data);
        setIsEligible(responseData.data.eligible);
        setEligibilityChecked(true);
      } else {
        throw new Error(responseData.message || "Failed to check eligibility");
      }
    } catch (err) {
      console.error("Error checking eligibility:", err);
      alert("Error checking eligibility. Please try again.");
    } finally {
      setEligibilityLoading(false);
    }
  };

  const startApplication = async () => {
    const token = getToken();
    
    if (!token) {
      alert("Please log in to start an application.");
      return;
    }
    
    console.log("Starting application for scheme:", {
      slug: slug,
      schemeData: schemeData
    });
    
    setApplicationLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/applications/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheme_slug: slug,
          }),
        }
      );
  
      if (response.status === 401) {
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem("access_token");
        return;
      }
  
      if (response.status === 403) {
        alert("You don't have permission to start this application.");
        return;
      }
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
  
      const responseData = await response.json();
  
      if (responseData.status === 1) {
        setApplicationId(responseData.data.application_id);
        
        // Close the eligibility modal properly
        const modal = document.getElementById('checkEligibilityModal');
        if (modal) {
          const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
          if (bootstrapModal) {
            bootstrapModal.hide();
          }
          // Clean up modal backdrop and body classes
          setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
              backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('padding-right');
            document.body.style.removeProperty('overflow');
          }, 300);
        }
        
        // Show application window
        setShowApplicationWindow(true);
        
      } else {
        throw new Error(responseData.message || "Failed to start application");
      }
    } catch (err) {
      console.error("Error starting application:", err);
      alert(`Error starting application: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setApplicationLoading(false);
    }
  };

  const handleApplicationSubmit = (applicationData: any) => {
    console.log("Application submitted:", applicationData);
    alert("Application submitted successfully!");
    setShowApplicationWindow(false);
    setApplicationId(null);
  };

  const resetEligibilityCheck = () => {
    setEligibilityAnswers(new Array(eligibilityQuestions.length).fill(null));
    setEligibilityResult(null);
    setIsEligible(false);
    setEligibilityChecked(false);
  };

  // SOLUTION 1: Full Screen Application Window
  // Render application window as a full-screen overlay instead of inside modal
  if (showApplicationWindow && applicationId) {
    return (
      <div className="position-fixed top-0 start-0 w-100 h-100 bg-white" 
           style={{ zIndex: 1060, overflowY: 'auto' }}>
        <ApplicationWindow
          schemeSlug={slug}
          schemeId={schemeData._id || schemeData.id}
          onApplicationSubmit={handleApplicationSubmit}
          onClose={() => {
            setShowApplicationWindow(false);
            setApplicationId(null);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-5">
        <button
          className="btn btn-primary px-md-5 py-md-3 me-3"
          data-bs-toggle="modal"
          data-bs-target="#checkEligibilityModal"
          onClick={fetchEligibilityQuestions}
        >
          Check eligibility
        </button>
        {isEligible && eligibilityChecked && (
          <button
            className="btn btn-success px-md-5 py-md-3"
            onClick={startApplication}
            disabled={applicationLoading}
          >
            {applicationLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Starting...
              </>
            ) : (
              "Apply Now"
            )}
          </button>
        )}
      </div>

      {/* Enhanced Eligibility Check Modal */}
      <div
        className="modal fade"
        id="checkEligibilityModal"
        aria-labelledby="checkEligibilityModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header" id="checkEligibilityModalHeader">
              <h5 className="modal-title">Check Eligibility</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <h4 className="mb-4 fw-normal">
                {schemeData.schemeName || schemeData.name || "Scheme Name"}
              </h4>

              {eligibilityLoading && (
                <div className="d-flex justify-content-center align-items-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}

              {!eligibilityLoading && eligibilityQuestions.length === 0 && (
                <div className="alert alert-info">
                  No eligibility questions available for this scheme.
                </div>
              )}

              {!eligibilityLoading &&
                eligibilityQuestions.length > 0 &&
                !eligibilityChecked && (
                  <div className="form-group">
                    <p className="mb-3">
                      Please answer the following questions to check your
                      eligibility:*
                    </p>
                    {eligibilityQuestions.map((question, index) => (
                      <div key={index} className="mb-4">
                        <p className="fw-medium mb-2">{question}</p>
                        <div className="d-flex gap-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`question_${index}`}
                              id={`question_${index}_yes`}
                              checked={eligibilityAnswers[index] === true}
                              onChange={() => handleAnswerChange(index, true)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`question_${index}_yes`}
                            >
                              Yes
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`question_${index}`}
                              id={`question_${index}_no`}
                              checked={eligibilityAnswers[index] === false}
                              onChange={() => handleAnswerChange(index, false)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`question_${index}_no`}
                            >
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {eligibilityChecked && eligibilityResult && (
                <div className="alert alert-info">
                  <h5
                    className={`alert-heading ${
                      isEligible ? "text-success" : "text-danger"
                    }`}
                  >
                    {isEligible ? "✅ You may be eligible!" : "❌ You are not eligible"}
                  </h5>
                  <p className="mb-0">
                    {isEligible
                      ? "Congratulations! You meet all the eligibility criteria for this scheme. You can now proceed to apply."
                      : "Unfortunately, you do not meet all the required eligibility criteria for this scheme."}
                  </p>
                  {!isEligible && (
                    <div className="mt-3">
                      <small className="text-muted">
                        <strong>Note:</strong> All eligibility criteria must be
                        met to qualify for this scheme.
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!eligibilityChecked && eligibilityQuestions.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitEligibilityCheck}
                  disabled={
                    eligibilityLoading ||
                    eligibilityAnswers.some((answer) => answer === null)
                  }
                >
                  {eligibilityLoading ? "Checking..." : "Check Eligibility"}
                </button>
              )}

              {eligibilityChecked && (
                <>
                  {isEligible && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={startApplication}
                      disabled={applicationLoading}
                    >
                      {applicationLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Starting Application...
                        </>
                      ) : (
                        "Apply Now"
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={resetEligibilityCheck}
                  >
                    Check Again
                  </button>
                </>
              )}

              <button
                type="button"
                className="btn btn-outline-secondary"
                data-bs-dismiss="modal"
                onClick={resetEligibilityCheck}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SchemeEligibilityAndApply;