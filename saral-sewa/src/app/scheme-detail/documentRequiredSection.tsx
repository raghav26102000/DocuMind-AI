// DocumentRequiredPage.jsx
"use client";

import React from "react"; // Import React
import ReactMarkdown from "react-markdown";

export default function DocumentRequiredPage({ schemeData }) {
  if (!schemeData) {
    return (
      <section className="document-required-section">
        <h3>Documents Required</h3>
        <p>Loading document requirements...</p>
      </section>
    );
  }

  // Correctly map to 'documents_required' from your JSON
  const requiredDocuments = schemeData.documentsRequired_md || [];
  // Correctly map to 'documentsRequired_md' from your JSON
  const documentGuidelines = schemeData.documentsRequired_md || "";

  return (
    <section className="document-required-section">
      <h3>Documents Required</h3>

      {/* Document Guidelines */}
      {documentGuidelines && (
        <div className="mb-4">
          <div>
            <h5 className="mb-2">Document Guidelines</h5>
            <ReactMarkdown>{documentGuidelines}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Required Documents List */}
      {/* Changed mapping to `requiredDocuments.map((doc, index)` and only rendering `doc` as it's a string */}
      {requiredDocuments && requiredDocuments.length > 0 ? (
        <div className="mb-4">
          <h4 className="mb-2">Required Documents</h4>
          <ReactMarkdown>{requiredDocuments}</ReactMarkdown>
        </div>
      ) : (
        <div className="mb-4">
          <h4>Common Documents Required</h4>
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="fas fa-id-card me-2"></i>
                    Identity Proof
                  </h6>
                  <p className="card-text small">
                    Aadhaar Card, Voter ID, Passport, or Driving License
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="fas fa-home me-2"></i>
                    Address Proof
                  </h6>
                  <p className="card-text small">
                    Utility bills, Bank statement, or Rental agreement
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="fas fa-university me-2"></i>
                    Bank Details
                  </h6>
                  <p className="card-text small">
                    Bank account statement or passbook copy
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="fas fa-money-check-alt me-2"></i>
                    Income Certificate
                  </h6>
                  <p className="card-text small">
                    Income certificate from competent authority
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="fas fa-users me-2"></i>
                    Category Certificate
                  </h6>
                  <p className="card-text small">
                    Caste/Category certificate (if applicable)
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="fas fa-camera me-2"></i>
                    Photographs
                  </h6>
                  <p className="card-text small">
                    Recent passport-size photographs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Submission Guidelines */}
      <div className="mt-4">
        <h4 className="mb-2">Document Submission Guidelines</h4>
        <div className="alert alert-light">
          <h6 className="alert-heading">Important Notes:</h6>
          <ul className="mb-0">
            <li>All documents should be self-attested</li>
            <li>Original documents may be required for verification</li>
            <li>Documents should be clear and legible</li>
            <li>Submit documents in the prescribed format only</li>
            <li>Incomplete documentation may lead to rejection</li>
          </ul>
        </div>
      </div>

      {/* Document Verification Process - Not present in sample JSON */}
      {schemeData.schemeContent?.documentVerification && (
        <div className="mt-4">
          <h4>Document Verification Process</h4>
          <ReactMarkdown>
            {schemeData.schemeContent.documentVerification}
          </ReactMarkdown>
        </div>
      )}
    </section>
  );
}
