// BenefitsPage.jsx
"use client";

import React from "react"; // Import React
import ReactMarkdown from "react-markdown";

export default function BenefitsPage({ schemeData }) {
  if (!schemeData) {
    return (
      <section className="benefits-section">
        <h3>Benefits</h3>
        <p>Loading benefits information...</p>
      </section>
    );
  }

  const schemeBenefits = schemeData.schemeContent?.benefits_md || "";

  return (
    <section className="benefits-section">
      <h3>Benefits</h3>

      {/* Benefit Type */}
      {schemeData.schemeContent?.benefitTypes?.label && (
        <div className="mb-2">
          {/* Correctly access the label property */}
          <strong>Type:</strong> {schemeData.schemeContent.benefitTypes.label}
        </div>
      )}

      {/* Scheme Benefits Description */}
      {schemeBenefits && (
        <div className="mb-4">
          <ReactMarkdown>{schemeBenefits}</ReactMarkdown>
        </div>
      )}

      {/* Financial Incentives - Not present in sample JSON */}
      {schemeData.schemeContent?.financialIncentives && (
        <div className="mt-4">
          <h4>Financial Incentives</h4>
          <ReactMarkdown>
            {schemeData.schemeContent.financialIncentives}
          </ReactMarkdown>
        </div>
      )}

      {/* Implementation Timeline - Not present in sample JSON */}
      {schemeData.schemeContent?.implementationTimeline && (
        <div className="mt-4">
          <h4>Implementation Timeline</h4>
          <p>{schemeData.schemeContent.implementationTimeline}</p>
        </div>
      )}
    </section>
  );
}
