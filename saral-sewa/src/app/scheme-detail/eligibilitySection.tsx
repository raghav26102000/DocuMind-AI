"use client";
import ReactMarkdown from "react-markdown";

export default function EligibilityPage({ schemeData }) {
  if (!schemeData) {
    return (
      <section className="eligibility-section">
        <h3>Eligibility</h3>
        <p>Loading eligibility information...</p>
      </section>
    );
  }

  // --- MODIFICATION START ---
  const eligibilityCriteriaContent =
    schemeData.schemeContent?.eligibilityCriteria || // This would be for direct string in schemeContent
    schemeData.eligibilityCriteria?.eligibilityDescription_md || // Access the specific property if eligibilityCriteria is an object
    "";
  // --- MODIFICATION END ---

  const eligibilityConditions =
    schemeData.schemeContent?.eligibilityConditions || [];
  const targetBeneficiaries = schemeData.targetBeneficiaries || [];

  return (
    <section className="eligibility-section">
      <h3>Eligibility</h3>

      {/* Target Beneficiaries */}
      {targetBeneficiaries && targetBeneficiaries.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2">Target Beneficiaries</h4>
          <div className="row">
            {targetBeneficiaries.map((beneficiary, index) => (
              <div key={index} className="col-md-6 mb-3">
                <div className="card h-100">
                  <div className="card-body">
                    <h6 className="card-title">
                      {typeof beneficiary === "string"
                        ? beneficiary
                        : beneficiary.label ||
                          beneficiary.name ||
                          `Beneficiary ${index + 1}`}
                    </h6>
                    {typeof beneficiary === "object" &&
                      beneficiary.description && (
                        <p className="card-text small">
                          {beneficiary.description}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility Criteria */}
      {/* --- MODIFICATION START --- */}
      {eligibilityCriteriaContent && (
        <div className="mb-4">
          <h4 className="mb-2">Eligibility Criteria</h4>
          <ReactMarkdown>{eligibilityCriteriaContent}</ReactMarkdown>
        </div>
      )}
      {/* --- MODIFICATION END --- */}

      {/* Eligibility Conditions */}
      {eligibilityConditions && eligibilityConditions.length > 0 && (
        <div className="mb-4">
          <h4>Eligibility Conditions</h4>
          <div className="accordion" id="eligibilityAccordion">
            {eligibilityConditions.map((condition, index) => (
              <div key={index} className="accordion-item">
                <h2 className="accordion-header" id={`heading${index}`}>
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse${index}`}
                    aria-expanded="false"
                    aria-controls={`collapse${index}`}
                  >
                    {typeof condition === "string"
                      ? `Condition ${index + 1}`
                      : condition.title ||
                        condition.label ||
                        `Condition ${index + 1}`}
                  </button>
                </h2>
                <div
                  id={`collapse${index}`}
                  className="accordion-collapse collapse"
                  aria-labelledby={`heading${index}`}
                  data-bs-parent="#eligibilityAccordion"
                >
                  <div className="accordion-body">
                    {typeof condition === "string" ? (
                      <p>{condition}</p>
                    ) : (
                      <p>
                        {condition.description ||
                          condition.details ||
                          condition.label}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Eligibility Information */}
      {!eligibilityCriteriaContent && // Use the new variable here
        (!eligibilityConditions || eligibilityConditions.length === 0) && (
          <div>
            <h4 className="mb-2">General Eligibility Guidelines</h4>
            <p className="mb-1">
              Eligibility for this scheme is determined based on various factors
              including:
            </p>
            <ul className="mb-2">
              <li>Applicant category and type</li>
              <li>Geographic location and state of operation</li>
              <li>Industry sector and business activity</li>
              <li>Financial and technical capabilities</li>
              <li>Compliance with regulatory requirements</li>
            </ul>
            <p>
              <strong>Note:</strong> For detailed eligibility criteria, please
              refer to the official scheme guidelines or contact the nodal
              department.
            </p>
          </div>
        )}

      {/* Age and Income Criteria */}
      {schemeData.schemeContent?.ageCriteria && (
        <div className="mt-4">
          <h4 className="mb-2">Age Criteria</h4>
          <p>{schemeData.schemeContent.ageCriteria}</p>
        </div>
      )}

      {schemeData.schemeContent?.incomeCriteria && (
        <div className="mt-4">
          <h4 className="mb-2">Income Criteria</h4>
          <p>{schemeData.schemeContent.incomeCriteria}</p>
        </div>
      )}

      {/* Additional Requirements */}
      {schemeData.schemeContent?.additionalRequirements && (
        <div className="mt-4">
          <h4 className="mb-2">Additional Requirements</h4>
          <ReactMarkdown>
            {schemeData.schemeContent.additionalRequirements}
          </ReactMarkdown>
        </div>
      )}
    </section>
  );
}
