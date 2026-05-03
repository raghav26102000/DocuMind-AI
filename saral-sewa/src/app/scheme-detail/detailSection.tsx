// DetailPage.jsx
"use client";

import React from "react"; // Import React
import ReactMarkdown from "react-markdown";

export default function DetailPage({ schemeData }) {
  if (!schemeData) {
    return (
      <section className="detail-section">
        <h3>Details</h3>
        <p>Loading scheme details...</p>
      </section>
    );
  }

  const briefDescription = schemeData.schemeContent?.briefDescription || "";
  const detailedDescription =
    schemeData.schemeContent?.detailedDescription_md || "";

  return (
    <section className="detail-section">
      <h3>Details</h3>

      {/* Brief Description */}
      {briefDescription && (
        <div className="mb-4">
          <h4 className="mb-2">Overview</h4>
          <p>{briefDescription}</p>
        </div>
      )}

      {/* Detailed Description */}
      {detailedDescription && (
        <div className="mb-4">
          <h4 className="mb-2">Detailed Description</h4>
          <ReactMarkdown>{detailedDescription}</ReactMarkdown>
        </div>
      )}

      {/* Additional Information */}
      <div className="row mt-4">
        <div className="col-md-6">
          <h5 className="mb-2">Scheme Information</h5>
          <ul className="list-unstyled">
            {/* FIX 1: schemeCategory is an array, map over it to get labels */}
            {schemeData.schemeCategory &&
              schemeData.schemeCategory.length > 0 && (
                <li>
                  <strong>Category:</strong>{" "}
                  {schemeData.schemeCategory.map((cat) => cat.label).join(", ")}
                </li>
              )}
            {/* FIX 2: schemeSubCategory is an array, map over it to get labels */}
            {schemeData.schemeSubCategory &&
              schemeData.schemeSubCategory?.length > 0 && (
                <li>
                  <strong>Sub-category:</strong>{" "}
                  {schemeData.schemeSubCategory
                    .map((subCat) => subCat.label || subCat.value)
                    .join(", ")}
                </li>
              )}
            {schemeData.state && (
              <li>
                {/* Correctly access the label property */}
                <strong>State:</strong> {schemeData.state?.label}
              </li>
            )}
            {/* FIX 3: nodalDepartmentName is an object with label property */}
            {schemeData.nodalDepartmentName && (
              <li>
                {/* Correctly access the label property */}
                <strong>Nodal Department:</strong>{" "}
                {schemeData.nodalDepartmentName?.label}
              </li>
            )}
          </ul>
        </div>

        <div className="col-md-6">
          <h5 className="mb-2">Target Beneficiaries</h5>
          {schemeData.targetBeneficiaries &&
          schemeData.targetBeneficiaries.length > 0 ? (
            <ul>
              {schemeData.targetBeneficiaries?.map((beneficiary, index) => (
                <li key={index}>
                  {typeof beneficiary === "string"
                    ? beneficiary
                    : beneficiary?.label || beneficiary?.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>Not specified</p>
          )}
        </div>
      </div>

      {/* Tags */}
    </section>
  );
}
