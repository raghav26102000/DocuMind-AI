"use client";

import Image from "next/image";
import { useState } from "react";
import "./document-upload.css";
import FileUploader from "../uploadFileComponent";
const steps = [
  { label: "Aadhaar Card", icon: AadhaarIcon },
  { label: "PAN Card", icon: PanIcon },
  { label: "BPL Card", icon: BPLIcon },
  { label: "12th Certificate", icon: EduactionIcon },
  { label: "Bill document", icon: BillIcon },
];
function AadhaarIcon({ color }: { color: string }) {
  return (
    <svg
      width="58"
      height="37"
      viewBox="0 0 58 37"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      href="http://www.w3.org/1999/xlink"
    >
      <rect width="57.5556" height="37" fill="url(#pattern0_146_7334)" />
      <defs>
        <pattern
          id="pattern0_146_7334"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            href="#image0_146_7334"
            transform="scale(0.00357143 0.00555556)"
          />
        </pattern>
        <image
          id="image0_146_7334"
          width="280"
          height="180"
          preserveAspectRatio="none"
          href="data:image/png;base64,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"
        />
      </defs>
    </svg>
  );
}

function PanIcon({ color }: { color: string }) {
  return (
    <svg
      width="46"
      height="46"
      viewBox="0 0 46 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M34.4997 24.9167C35.0427 24.9167 35.4983 24.7327 35.8663 24.3647C36.2343 23.9967 36.4176 23.5418 36.4163 23C36.4151 22.4582 36.2311 22.0034 35.8643 21.6354C35.4976 21.2674 35.0427 21.0834 34.4997 21.0834H28.7497C28.2066 21.0834 27.7517 21.2674 27.385 21.6354C27.0183 22.0034 26.8343 22.4582 26.833 23C26.8317 23.5418 27.0157 23.9973 27.385 24.3666C27.7543 24.7359 28.2092 24.9192 28.7497 24.9167H34.4997ZM34.4997 19.1667C35.0427 19.1667 35.4983 18.9827 35.8663 18.6147C36.2343 18.2467 36.4176 17.7918 36.4163 17.25C36.4151 16.7082 36.2311 16.2534 35.8643 15.8854C35.4976 15.5174 35.0427 15.3334 34.4997 15.3334H28.7497C28.2066 15.3334 27.7517 15.5174 27.385 15.8854C27.0183 16.2534 26.8343 16.7082 26.833 17.25C26.8317 17.7918 27.0157 18.2473 27.385 18.6166C27.7543 18.9859 28.2092 19.1692 28.7497 19.1667H34.4997ZM17.2497 24.9167C16.0997 24.9167 15.0615 25.0208 14.1351 25.2291C13.2087 25.4374 12.3941 25.7645 11.6913 26.2104C11.0205 26.6257 10.5094 27.0972 10.158 27.6249C9.80662 28.1527 9.63092 28.7194 9.63092 29.325C9.63092 29.7084 9.77467 30.0278 10.0622 30.2834C10.3497 30.5389 10.7011 30.6667 11.1163 30.6667H23.383C23.7983 30.6667 24.1497 30.5306 24.4372 30.2584C24.7247 29.9863 24.8684 29.6432 24.8684 29.2292C24.8684 28.6861 24.6927 28.159 24.3413 27.6479C23.99 27.1368 23.4788 26.6577 22.808 26.2104C22.1052 25.7632 21.2906 25.4355 20.3643 25.2272C19.4379 25.0189 18.3997 24.9154 17.2497 24.9167ZM17.2497 23C18.3038 23 19.206 22.625 19.956 21.8749C20.7061 21.1249 21.0817 20.2221 21.083 19.1667C21.0843 18.1112 20.7093 17.2091 19.9579 16.4604C19.2066 15.7116 18.3038 15.3359 17.2497 15.3334C16.1955 15.3308 15.2934 15.7065 14.5433 16.4604C13.7933 17.2142 13.4176 18.1164 13.4163 19.1667C13.4151 20.217 13.7907 21.1198 14.5433 21.8749C15.296 22.6301 16.1981 23.0051 17.2497 23ZM7.66634 38.3334C6.61217 38.3334 5.71006 37.9583 4.96001 37.2083C4.20995 36.4582 3.83429 35.5555 3.83301 34.5V11.5C3.83301 10.4459 4.20867 9.54374 4.96001 8.79369C5.71134 8.04363 6.61345 7.66796 7.66634 7.66669H38.333C39.3872 7.66669 40.2899 8.04235 41.0413 8.79369C41.7926 9.54502 42.1676 10.4471 42.1663 11.5V34.5C42.1663 35.5542 41.7913 36.4569 41.0413 37.2083C40.2912 37.9596 39.3885 38.3346 38.333 38.3334H7.66634ZM7.66634 34.5H38.333V11.5H7.66634V34.5Z"
        fill={color}
      />
    </svg>
  );
}

function BPLIcon({ color }: { color: string }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_146_7337)">
        <path
          d="M41.125 12.6875C35.875 11.8125 26.25 11.375 21 11.375C15.75 11.375 6.125 11.8125 0.875 12.6875M41.125 19.6875C35.875 18.8125 26.25 18.375 21 18.375C15.75 18.375 6.125 18.8125 0.875 19.6875M21.875 29.75C21.875 26.859 22.9372 25.375 24.7065 25.375C26.4758 25.375 27.125 27.6028 27.125 29.0868H27.2072C27.2072 29.0868 27.7078 27.6027 29.3125 27.6027C30.9172 27.6027 31.0467 29.253 31.0467 29.253C32.6165 29.3405 34.1687 29.4455 35.875 29.5767M41.125 7.4375V35.875H40.25C35 35 26.25 34.5625 21 34.5625C15.75 34.5625 7 35 1.75 35.875H0.875V7.4375C6.125 6.5625 15.75 6.125 21 6.125C26.25 6.125 35.875 6.5625 41.125 7.4375Z"
          stroke={color}
          strokeWidth="4"
        />
      </g>
      <defs>
        <clipPath id="clip0_146_7337">
          <rect width="42" height="42" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function EduactionIcon({ color }: { color: string }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_146_7339)">
        <path
          d="M23 33H3C2.46957 33 1.96086 32.7893 1.58579 32.4142C1.21071 32.0391 1 31.5304 1 31V5C1 4.46957 1.21071 3.96086 1.58579 3.58579C1.96086 3.21071 2.46957 3 3 3H39C39.5304 3 40.0391 3.21071 40.4142 3.58579C40.7893 3.96086 41 4.46957 41 5V31C41 31.5304 40.7893 32.0391 40.4142 32.4142C40.0391 32.7893 39.5304 33 39 33H31M9 11H33M9 18H15M9 25H13"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 30C28.5913 30 30.1174 29.3679 31.2426 28.2426C32.3679 27.1174 33 25.5913 33 24C33 22.4087 32.3679 20.8826 31.2426 19.7574C30.1174 18.6321 28.5913 18 27 18C25.4087 18 23.8826 18.6321 22.7574 19.7574C21.6321 20.8826 21 22.4087 21 24C21 25.5913 21.6321 27.1174 22.7574 28.2426C23.8826 29.3679 25.4087 30 27 30Z"
          fill={color}
          stroke={color}
          strokeWidth="4"
        />
        <path
          d="M27 37L31 39V28.472C31 28.472 29.86 30 27 30C24.14 30 23 28.5 23 28.5V39L27 37Z"
          fill={color}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_146_7339">
          <rect width="42" height="42" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function BillIcon({ color }: { color: string }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 8.75C7 7.35761 7.55312 6.02226 8.53769 5.03769C9.52226 4.05312 10.8576 3.5 12.25 3.5H29.75C31.1424 3.5 32.4777 4.05312 33.4623 5.03769C34.4469 6.02226 35 7.35761 35 8.75V36.75C34.9998 37.0796 34.9065 37.4025 34.7309 37.6814C34.5553 37.9603 34.3044 38.1839 34.0073 38.3266C33.7101 38.4692 33.3787 38.525 33.0513 38.4876C32.7238 38.4502 32.4135 38.321 32.1562 38.115L28.875 35.49L25.5938 38.115C25.2576 38.3843 24.8339 38.5202 24.4038 38.4966C23.9738 38.473 23.5675 38.2917 23.2628 37.9872L21 35.7245L18.7372 37.9872C18.4328 38.2919 18.0266 38.4736 17.5965 38.4975C17.1664 38.5214 16.7426 38.3858 16.4062 38.1167L13.125 35.49L9.84375 38.115C9.58645 38.321 9.2762 38.4502 8.94873 38.4876C8.62126 38.525 8.28987 38.4692 7.99272 38.3266C7.69557 38.1839 7.44475 37.9603 7.26912 37.6814C7.09349 37.4025 7.00021 37.0796 7 36.75V8.75ZM12.25 7C11.7859 7 11.3408 7.18437 11.0126 7.51256C10.6844 7.84075 10.5 8.28587 10.5 8.75V33.11L12.0312 31.885C12.3416 31.6365 12.7274 31.5011 13.125 31.5011C13.5226 31.5011 13.9084 31.6365 14.2188 31.885L17.3688 34.405L19.7628 32.0127C20.0909 31.6847 20.536 31.5004 21 31.5004C21.464 31.5004 21.9091 31.6847 22.2372 32.0127L24.6295 34.405L27.7812 31.885C28.0916 31.6365 28.4774 31.5011 28.875 31.5011C29.2726 31.5011 29.6584 31.6365 29.9688 31.885L31.5 33.11V8.75C31.5 8.28587 31.3156 7.84075 30.9874 7.51256C30.6593 7.18437 30.2141 7 29.75 7H12.25ZM14 15.75C14 15.2859 14.1844 14.8408 14.5126 14.5126C14.8408 14.1844 15.2859 14 15.75 14H26.25C26.7141 14 27.1592 14.1844 27.4874 14.5126C27.8156 14.8408 28 15.2859 28 15.75C28 16.2141 27.8156 16.6592 27.4874 16.9874C27.1592 17.3156 26.7141 17.5 26.25 17.5H15.75C15.2859 17.5 14.8408 17.3156 14.5126 16.9874C14.1844 16.6592 14 16.2141 14 15.75ZM15.75 21C15.2859 21 14.8408 21.1844 14.5126 21.5126C14.1844 21.8408 14 22.2859 14 22.75C14 23.2141 14.1844 23.6592 14.5126 23.9874C14.8408 24.3156 15.2859 24.5 15.75 24.5H21C21.4641 24.5 21.9092 24.3156 22.2374 23.9874C22.5656 23.6592 22.75 23.2141 22.75 22.75C22.75 22.2859 22.5656 21.8408 22.2374 21.5126C21.9092 21.1844 21.4641 21 21 21H15.75Z"
        fill={color}
      />
    </svg>
  );
}

export default function DocumentUploadPage() {
  const [currentStep, setCurrentStep] = useState(1);
  return (
    <div className="upload-page-wrapper">
      <div className="d-flex pb-5">
        <a href="/scheme-detail" className="btn" style={{ fontSize: "24px" }}>
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
      <h1 className="mb-3">
        Hi Kunal, <br />
        Be Ready with your documents
      </h1>
      <h4 className="mb-5">
        Keep the background clear to get your document verify quickly
      </h4>
      <div className="row">
        <div className="col-lg-6 col-md-5">
          <div
            className="d-flex flex-column align-items-start position-relative"
            style={{ gap: "40px" }}
          >
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const inProgress = index == currentStep;
              const Icon = step.icon;
              const color = isCompleted
                ? "#17B042"
                : inProgress
                ? "#2279e4"
                : "#C8C8C8";
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
                        backgroundColor: isCompleted
                          ? "#17B042"
                          : inProgress
                          ? "#2279e4"
                          : "#C8C8C8",
                      }}
                    />
                  )}

                  {/* Icon Circle */}
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center icon-wrapper"
                    style={{
                      border: `1px solid ${
                        isCompleted
                          ? "#17B042"
                          : inProgress
                          ? "#2279e4"
                          : "#C8C8C8"
                      }`,
                    }}
                  >
                    {isCompleted && (
                      <div className="iscompleted-check">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2.75 8.75L6.25 12.25L13.25 4.75"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                    <Icon color={color} />
                  </div>

                  {/* Label */}
                  <span className="ms-3">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-lg-6 col-md-7">
          <FileUploader />
        </div>
      </div>
      <div className="row">
        <div className="col-12 text-end my-5">
          <button className="btn btn-primary px-md-5 py-md-3">
            Start Application
          </button>
        </div>
      </div>
    </div>
  );
}
