"use client";

const steps = [
  { label: "Demographic" },
  { label: "Place" },
  { label: "Caste" },
  { label: "Disability" },
  { label: "Student" },
  { label: "BPL" },
];

export default function StepProgressBar({
  formStepNumber,
}: {
  formStepNumber: any;
}) {
  return (
    <>
      <div
        className="d-flex flex-column align-items-start position-relative"
        style={{ gap: "40px" }}
      >
        {steps.map((step, index) => {
          const currentStep = formStepNumber;
          const isCompleted = index < currentStep;
          const inProgress = index == currentStep;
          const color = isCompleted
            ? "#17B042"
            : inProgress
            ? "#2279e4"
            : "#D0CDCD";
          return (
            <div
              className="d-flex align-items-center position-relative"
              key={index}
            >
              {/* Vertical Line */}
              {index < steps.length - 1 && (
                <div
                  className="position-absolute stepper-strip"
                  style={{
                    backgroundColor:
                      isCompleted || inProgress ? "#2279e4" : "#D0CDCD",
                  }}
                />
              )}

              {/* Icon Circle */}
              <div
                className="rounded-circle d-flex align-items-center justify-content-center icon-wrapper p-1"
                style={{
                  border: `1px solid ${
                    isCompleted || inProgress ? "#2279e4" : "#D0CDCD"
                  }`,
                  backgroundColor: `${isCompleted ? "#2279e4" : "transparent"}`,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.75 8.75L6.25 12.25L13.25 4.75"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      stroke: `${
                        isCompleted
                          ? "#fff"
                          : inProgress
                          ? "#2279e4"
                          : "#D0CDCD"
                      }`,
                    }}
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
