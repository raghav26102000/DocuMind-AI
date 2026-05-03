// ApplicationProcessPage.jsx
"use client";

import React from "react"; // Import React
import ReactMarkdown from "react-markdown";

export default function ApplicationProcessPage({ schemeData }) {
  if (!schemeData) {
    return (
      <section className="application-process-section">
        <h3>Application Process</h3>
        <p>Loading application process information...</p>
      </section>
    );
  }

  // Correctly access applicationProcess as an array and then its process_md
  const applicationProcessItem = schemeData.applicationProcess?.[0];
  const applicationProcessMd = applicationProcessItem?.process_md || "";

  // The JSON does not have a separate 'applicationSteps' array.
  // The steps are part of the 'process_md' string.
  // If you want to parse steps from process_md, you'd need more complex parsing logic.
  // For now, we'll just display the markdown content directly.
  const applicationSteps = []; // Not available as a separate array in your JSON

  const applicationUrl =
    schemeData.schemeContent?.applicationUrl || schemeData.applicationUrl || "";
  const applicationDeadline =
    schemeData.schemeContent?.applicationDeadline ||
    schemeData.applicationDeadline ||
    "";

  return (
    <section className="application-process-section">
      <h3>Application Process</h3>
      {/* Application Process Description - use the correctly mapped markdown */}
      {applicationProcessMd && (
        <div className="mb-4">
          <ReactMarkdown>{applicationProcessMd}</ReactMarkdown>
        </div>
      )}

      {/* Application Steps - This block will not render from your provided JSON as applicationSteps is empty */}
      {applicationSteps && applicationSteps.length > 0 ? (
        <div className="mb-4">
          <h4 className="mb-3">Step-by-Step Process</h4>
          <div className="scheme-steps">
            <div className="row mb-lg-5 mb-md-4 mb-3">
              <div className="col-1 py-4">
                <div className="vr-line"></div>
              </div>
              <div className="col-11">
                {applicationSteps.map((step, index) => (
                  <div className="scheme-step-box">
                    <span className="step-number">
                      {typeof step === "string"
                        ? `Step ${index + 1}`
                        : step.title || step.label || `Step ${index + 1}`}
                    </span>
                    <span className="step-desc">
                      {typeof step === "string"
                        ? step
                        : step.description || step.details || step.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* <div className="timeline">
            <ol>
              {applicationSteps.map((step, index) => (
                <li key={index} className="d-flex flex-column">
                  <h6>
                    {typeof step === "string"
                      ? `Step ${index + 1}`
                      : step.title || step.label || `Step ${index + 1}`}
                  </h6>
                  <p>
                    {typeof step === "string"
                      ? step
                      : step.description || step.details || step.content}
                  </p>
                  {typeof step === "object" && step.duration && (
                    <small className="text-muted">
                      Duration: {step.duration}
                    </small>
                  )}
                </li>
              ))}
            </ol>
          </div> */}
        </div>
      ) : (
        <div className="mb-4">
          <h4 className="mb-3">General Application Process</h4>
          <div className="row">
            <div className="col-1 py-4">
              <div className="vr-line"></div>
            </div>
            <div className="col-11">
              <li className="scheme-step-box">
                <span className="step-number">Check Eligibility</span>
                <span className="step-desc">
                  Review the eligibility criteria and ensure you meet all
                  requirements.
                </span>
              </li>
              <li className="scheme-step-box">
                <span className="step-number">Prepare Documents</span>
                <span className="step-desc">
                  Gather all required documents and ensure they are properly
                  attested.
                </span>
              </li>
              <li className="scheme-step-box">
                <span className="step-number">Submit Application</span>
                <span className="step-desc">
                  Complete the application form and submit it through the
                  designated channel.
                </span>
              </li>
              <li className="scheme-step-box">
                <span className="step-number">Application Review</span>
                <span className="step-desc">
                  Your application will be reviewed by the concerned
                  authorities.
                </span>
              </li>
              <li className="scheme-step-box">
                <span className="step-number">Approval & Disbursement</span>
                <span className="step-desc">
                  Upon approval, benefits will be disbursed as per scheme
                  guidelines.
                </span>
              </li>
            </div>
          </div>
        </div>
      )}

      {/* Application URL */}
      {applicationUrl && (
        <div className="mb-4">
          <h4 className="mb-2">Online Application</h4>
          <div className="card">
            <div className="card-body d-flex flex-wrap align-items-center w-100 justify-content-between">
              <p className="card-text me-2">
                Apply online through the official portal:
              </p>
              <a
                href={applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Apply Online
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Application Deadline */}
      {applicationDeadline && (
        <div className="mb-4">
          <div className="alert alert-warning">
            <h6 className="alert-heading mb-1">Important Deadline</h6>
            <small className="mb-0">
              <strong>Application Deadline:</strong> {applicationDeadline}
            </small>
          </div>
        </div>
      )}

      {/* Contact Information */}
      {schemeData.nodalDepartmentName && (
        <div className="mt-4">
          <h4 className="mb-2">Contact Information</h4>
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-1">Nodal Department</h6>
              <p className="card-text mb-1">
                {/* Correctly access the label property */}
                {schemeData.nodalDepartmentName.label}
              </p>
              {schemeData.contactEmail && (
                <p className="card-text mb-1">
                  <strong>Email:</strong> {schemeData.contactEmail}
                </p>
              )}
              {schemeData.contactPhone && (
                <p className="card-text mb-1">
                  <strong>Phone:</strong> {schemeData.contactPhone}
                </p>
              )}
              {schemeData.contactAddress && (
                <p className="card-text">
                  <strong>Address:</strong> {schemeData.contactAddress}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
