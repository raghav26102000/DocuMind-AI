"use client";

import { useState } from "react";
import "./browse-scheme.css";
import "./stepProgressbar";
import StepProgressBar from "./stepProgressbar";

export default function BrowseSchemePage() {
  const [formStepNumber, setFormStepNumber] = useState(1);
  const [gender, setGender] = useState("");
  const [caste, setCaste] = useState("");
  const [isDisabled, setDisabilityStatus] = useState(false);
  const [isStudent, setStudentStatus] = useState(false);
  const [isBPL, setBPLStatus] = useState(false);
  const [isBPLSubCategory, setBPLSubCategory] = useState(false);
  const nextStep = () => {
    setFormStepNumber((prev) => prev + 1);
  };

  const prevStep = () => {
    setFormStepNumber((prev) => (prev > 1 ? prev - 1 : prev));
  };
  return (
    <section className="browseSchemeWrapper">
      <div className="d-flex pb-5">
        {formStepNumber == 1 && (
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
        )}
        {formStepNumber > 1 && (
          <a onClick={prevStep} className="btn" style={{ fontSize: "24px" }}>
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
        )}
      </div>
      <h1 className="page-heading">
        {(formStepNumber == 1 || formStepNumber == 2) &&
          "Help us find the best schemes for you"}
        {formStepNumber == 3 && "Your Cast"}
        {formStepNumber == 4 &&
          "Do you identify as a person with a disability?"}
        {formStepNumber == 5 && "Are you Student?"}
        {formStepNumber == 6 && "Do you belong to BPL category?"}
        {formStepNumber == 7 && "Thanks for sharing details"}
      </h1>
      <div className="row">
        <div className="col-1">
          <StepProgressBar formStepNumber={formStepNumber - 1} />
        </div>
        <div className="col-lg-6 col-md-8 col-11">
          {formStepNumber == 1 && (
            <div className="row">
              <div className="col-12">
                <div className="form-group mb-xl-4 mb-md-3">
                  <label className="heading-label">
                    *Tell us about yourself, you are a...
                  </label>
                  <div className="radio-box-wrapper">
                    <label htmlFor="male" className="radio-box">
                      <input
                        type="radio"
                        name="gender"
                        id="male"
                        checked={gender === "male"}
                        onChange={() => setGender("male")}
                      />
                      <div className="name">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M26.6673 5.33301V13.333H24.0007V9.89967L18.7007 15.1663C19.1229 15.7886 19.4451 16.4499 19.6673 17.1503C19.8895 17.8508 20.0007 18.5783 20.0007 19.333C20.0007 21.3775 19.2895 23.1108 17.8673 24.533C16.4451 25.9552 14.7118 26.6663 12.6673 26.6663C10.6229 26.6663 8.88954 25.9552 7.46732 24.533C6.0451 23.1108 5.33398 21.3775 5.33398 19.333C5.33398 17.2886 6.0451 15.5552 7.46732 14.133C8.88954 12.7108 10.6229 11.9997 12.6673 11.9997C13.4007 11.9997 14.1229 12.105 14.834 12.3157C15.5451 12.5263 16.2007 12.8543 16.8007 13.2997L22.1007 7.99967H18.6673V5.33301H26.6673ZM12.6673 14.6663C11.3784 14.6663 10.2784 15.1219 9.36732 16.033C8.45621 16.9441 8.00065 18.0441 8.00065 19.333C8.00065 20.6219 8.45621 21.7219 9.36732 22.633C10.2784 23.5441 11.3784 23.9997 12.6673 23.9997C13.9562 23.9997 15.0562 23.5441 15.9673 22.633C16.8784 21.7219 17.334 20.6219 17.334 19.333C17.334 18.0441 16.8784 16.9441 15.9673 16.033C15.0562 15.1219 13.9562 14.6663 12.6673 14.6663Z"
                            fill="#2279E4"
                          />
                        </svg>

                        <span>Male</span>
                      </div>
                    </label>
                    <label htmlFor="female" className="radio-box">
                      <input
                        type="radio"
                        name="gender"
                        id="female"
                        checked={gender === "female"}
                        onChange={() => setGender("female")}
                      />
                      <div className="name">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M14.666 27.9997V25.333H11.9994V22.6663H14.666V19.8663C12.9105 19.5552 11.4714 18.7161 10.3487 17.349C9.22602 15.9819 8.66513 14.3988 8.66602 12.5997C8.66602 10.5775 9.38291 8.86101 10.8167 7.45034C12.2505 6.03968 13.978 5.3339 15.9994 5.33301C18.0207 5.33212 19.7487 6.0379 21.1833 7.45034C22.618 8.86279 23.3345 10.5792 23.3327 12.5997C23.3327 14.3997 22.7713 15.9832 21.6487 17.3503C20.526 18.7175 19.0874 19.5561 17.3327 19.8663V22.6663H19.9994V25.333H17.3327V27.9997H14.666ZM15.9994 17.333C17.2882 17.333 18.3882 16.8775 19.2994 15.9663C20.2105 15.0552 20.666 13.9552 20.666 12.6663C20.666 11.3775 20.2105 10.2775 19.2994 9.36634C18.3882 8.45523 17.2882 7.99968 15.9994 7.99968C14.7105 7.99968 13.6105 8.45523 12.6993 9.36634C11.7882 10.2775 11.3327 11.3775 11.3327 12.6663C11.3327 13.9552 11.7882 15.0552 12.6993 15.9663C13.6105 16.8775 14.7105 17.333 15.9994 17.333Z"
                            fill="black"
                          />
                        </svg>

                        <span>Female</span>
                      </div>
                    </label>

                    <label htmlFor="transgender" className="radio-box">
                      <input
                        type="radio"
                        name="gender"
                        id="transgender"
                        checked={gender === "transgender"}
                        onChange={() => setGender("transgender")}
                      />
                      <div className="name">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16 10.6663C18.5733 10.6663 20.6667 12.7597 20.6667 15.333C20.6667 17.9063 18.5733 19.9997 16 19.9997C13.4267 19.9997 11.3333 17.9063 11.3333 15.333C11.3333 12.7597 13.4267 10.6663 16 10.6663ZM22.04 11.173L27.3333 5.89301V9.33301H30V1.33301H22V3.99967H25.44L20.1467 9.29301C18.9733 8.47967 17.5467 7.99967 16 7.99967C14.4533 7.99967 13.0267 8.47967 11.8533 9.29301L10.9867 8.42634L12.8667 6.54634L10.9867 4.65301L9.09333 6.53301L6.56 3.99967H10V1.33301H2V9.33301H4.66667V5.89301L7.21333 8.42634L5.32 10.3197L7.2 12.1997L9.08 10.3197L9.94667 11.1863C9.14667 12.3597 8.66667 13.7863 8.66667 15.333C8.66615 17.047 9.26603 18.7071 10.3621 20.0248C11.4582 21.3425 12.9812 22.2347 14.6667 22.5463V25.333H12V27.9997H14.6667V30.6663H17.3333V27.9997H20V25.333H17.3333V22.5463C18.5365 22.3242 19.665 21.8046 20.616 21.0348C21.567 20.265 22.3102 19.2695 22.7781 18.139C23.2459 17.0085 23.4235 15.7789 23.2946 14.5622C23.1657 13.3455 22.7344 12.1804 22.04 11.173Z"
                            fill="black"
                          />
                        </svg>

                        <span>Transgender</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label className="heading-label" htmlFor="age">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    id="age"
                    className="form-control"
                    min={0}
                    max={120}
                  />
                </div>
              </div>
            </div>
          )}
          {formStepNumber == 2 && (
            <div className="row">
              <div className="col-12">
                <div className="form-group mb-md-4">
                  <label className="heading-label" htmlFor="state">
                    Please select your state
                  </label>
                  <select className="form-select" name="state" id="state">
                    <option value="HR">Haryana</option>
                  </select>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group mb-md-4">
                  <label className="heading-label" htmlFor="residenceArea">
                    *Please select your area of residence
                  </label>
                  <select
                    className="form-select"
                    name="residenceArea"
                    id="residenceArea"
                  >
                    <option value="UR">Urban</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {formStepNumber == 3 && (
            <div className="row">
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label htmlFor="state" className="heading-label">
                    Please select your caste
                  </label>
                  <div className="radio-box-wrapper">
                    <label htmlFor="general" className="radio-box">
                      <input
                        type="radio"
                        name="caste"
                        id="general"
                        checked={caste === "general"}
                        onChange={() => setCaste("general")}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>General</span>
                      </div>
                    </label>
                    <label htmlFor="obc" className="radio-box">
                      <input
                        type="radio"
                        name="caste"
                        id="obc"
                        checked={caste === "obc"}
                        onChange={() => setCaste("obc")}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Other Backward Class (OBC)</span>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11 7H13V9H11V7ZM11 11H13V17H11V11ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                            fill="#D0CDCD"
                          />
                        </svg>
                      </div>
                    </label>
                    <label htmlFor="pvtg" className="radio-box">
                      <input
                        type="radio"
                        name="caste"
                        id="pvtg"
                        checked={caste === "pvtg"}
                        onChange={() => setCaste("pvtg")}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Particularly Vulnerable Tribal Group (PVTG)</span>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11 7H13V9H11V7ZM11 11H13V17H11V11ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                            fill="#D0CDCD"
                          />
                        </svg>
                      </div>
                    </label>
                    <label htmlFor="sc" className="radio-box">
                      <input
                        type="radio"
                        name="caste"
                        id="sc"
                        checked={caste === "sc"}
                        onChange={() => setCaste("sc")}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Scheduled Caste (SC)</span>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11 7H13V9H11V7ZM11 11H13V17H11V11ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                            fill="#D0CDCD"
                          />
                        </svg>
                      </div>
                    </label>
                    <label htmlFor="st" className="radio-box">
                      <input
                        type="radio"
                        name="caste"
                        id="st"
                        checked={caste === "st"}
                        onChange={() => setCaste("st")}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Scheduled Tribe (ST)</span>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11 7H13V9H11V7ZM11 11H13V17H11V11ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                            fill="#D0CDCD"
                          />
                        </svg>
                      </div>
                    </label>
                    <label htmlFor="dnt" className="radio-box">
                      <input
                        type="radio"
                        name="caste"
                        id="dnt"
                        checked={caste === "dnt"}
                        onChange={() => setCaste("dnt")}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>
                          De-Notified, Nomadic, and Semi-Nomadic (DNT)
                          communities
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          {formStepNumber == 4 && (
            <div className="row">
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label htmlFor="isDisable" className="heading-label">
                    Please select your Disability
                  </label>
                  <div className="radio-box-wrapper">
                    <label htmlFor="disabled" className="radio-box">
                      <input
                        type="radio"
                        name="disabilityStatus"
                        id="disabled"
                        checked={isDisabled}
                        onChange={() => setDisabilityStatus(true)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Yes</span>
                      </div>
                    </label>
                    <label htmlFor="noDisability" className="radio-box">
                      <input
                        type="radio"
                        name="disabilityStatus"
                        id="noDisability"
                        checked={!isDisabled}
                        onChange={() => setDisabilityStatus(false)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>No</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label className="heading-label" htmlFor="disabilityLevel">
                    *What is your differently abled percentage?
                  </label>
                  <select
                    className="form-select"
                    name="disabilityLevel"
                    id="disabilityLevel"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {formStepNumber == 5 && (
            <div className="row">
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label htmlFor="isDisable" className="heading-label">
                    Select One
                  </label>
                  <div className="radio-box-wrapper">
                    <label htmlFor="isStudent" className="radio-box">
                      <input
                        type="radio"
                        name="studentStatus"
                        id="isStudent"
                        checked={isStudent}
                        onChange={() => setStudentStatus(true)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Yes</span>
                      </div>
                    </label>
                    <label htmlFor="notStudent" className="radio-box">
                      <input
                        type="radio"
                        name="studentStatus"
                        id="notStudent"
                        checked={!isStudent}
                        onChange={() => setStudentStatus(false)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>No</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          {formStepNumber == 6 && (
            <div className="row">
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label htmlFor="isDisable" className="heading-label">
                    Select One
                  </label>
                  <div className="radio-box-wrapper">
                    <label htmlFor="inBPL" className="radio-box">
                      <input
                        type="radio"
                        name="BPLStatus"
                        id="inBPL"
                        checked={isBPL}
                        onChange={() => setBPLStatus(true)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Yes</span>
                      </div>
                    </label>
                    <label htmlFor="notInBPL" className="radio-box">
                      <input
                        type="radio"
                        name="BPLStatus"
                        id="notInBPL"
                        checked={!isBPL}
                        onChange={() => setBPLStatus(false)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>No</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group  mb-md-4">
                  <label htmlFor="isDisable" className="heading-label">
                    Select One
                  </label>
                  <div className="radio-box-wrapper">
                    <label htmlFor="inBPLSubCategory" className="radio-box">
                      <input
                        type="radio"
                        name="BPLSubCategory"
                        id="inBPLSubCategory"
                        checked={isBPLSubCategory}
                        onChange={() => setBPLSubCategory(true)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>Yes</span>
                      </div>
                    </label>
                    <label htmlFor="notInBPLSubCategory" className="radio-box">
                      <input
                        type="radio"
                        name="BPLSubCategory"
                        id="notInBPLSubCategory"
                        checked={!isBPLSubCategory}
                        onChange={() => setBPLSubCategory(false)}
                      />
                      <div className="name caste">
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
                          />
                        </svg>

                        <span>No</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          {formStepNumber == 7 && (
            <div className="row">
              <div className="col-12">
                <div className="d-flex flex-column align-items-center">
                  <div>
                    <svg
                      width="116"
                      height="116"
                      viewBox="0 0 116 116"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M62.4268 15.6797C59.5475 14.7565 56.4515 14.7565 53.5721 15.6797L21.9911 25.8104C20.8578 26.1793 19.9008 26.9539 19.3038 27.9854L8.49164 46.6614C8.1301 47.2862 7.91312 47.9841 7.85662 48.7038C7.80013 49.4235 7.90555 50.1467 8.16516 50.8202C8.42477 51.4938 8.83197 52.1007 9.35684 52.5963C9.88172 53.0919 10.5109 53.4637 11.1983 53.6842L45.7083 64.7622C46.7588 65.0995 47.8931 65.0671 48.9227 64.6706C49.9523 64.274 50.8152 63.5372 51.3681 62.5824L53.1661 59.4794V70.6782C53.1661 71.4397 52.9862 72.1903 52.641 72.8691C52.2959 73.5478 51.7952 74.1353 51.1799 74.5839C50.5646 75.0324 49.852 75.3292 49.1002 75.4501C48.3484 75.571 47.5787 75.5126 46.8538 75.2796L18.6368 66.2267V82.0704C18.6359 84.1178 19.285 86.1127 20.4907 87.7674C21.6963 89.4222 23.3963 90.6514 25.3455 91.2779L53.5721 100.326C56.4515 101.249 59.5475 101.249 62.4268 100.326L90.6535 91.2779C92.6036 90.6522 94.3046 89.4234 95.5112 87.7685C96.7178 86.1137 97.3676 84.1184 97.367 82.0704L97.3573 66.2267L69.1451 75.2796C68.4198 75.5127 67.6497 75.5711 66.8975 75.4499C66.1454 75.3288 65.4325 75.0315 64.8171 74.5825C64.2017 74.1334 63.7011 73.5452 63.3563 72.8658C63.0114 72.1865 62.8321 71.4353 62.8328 70.6734V59.4746L64.626 62.5776C65.1796 63.5315 66.0429 64.2673 67.0724 64.663C68.102 65.0586 69.2358 65.0902 70.2858 64.7526L104.801 53.6842C105.489 53.4638 106.119 53.092 106.644 52.596C107.169 52.1001 107.577 51.4927 107.837 50.8184C108.096 50.1442 108.201 49.4204 108.144 48.7001C108.087 47.9799 107.87 47.2816 107.507 46.6566L96.6952 27.9854C96.0982 26.9539 95.1411 26.1793 94.0078 25.8104L62.4268 15.6797ZM76.6996 30.4117L57.9995 36.4099L39.2945 30.4117L56.5205 24.8824C57.4808 24.5743 58.5134 24.5743 59.4736 24.8824L76.6996 30.4117Z"
                        fill="#DBDBDB"
                      />
                    </svg>
                  </div>
                  <h2 className="page-heading mb-3">
                    No Schemes available for now
                  </h2>
                  <label className="heading-label mb-md-5 mb-4">
                    Don’t worry our team find best schemes for you
                  </label>
                  <div className="d-flex align-items-center flex-wrap">
                    <button className="btn btn-primary me-3">
                      Explore other Schemes
                    </button>
                    <button className="btn btn-outline-primary">
                      Back to Home
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="row">
        <div className="col-12 text-end">
          {formStepNumber < 7 && (
            <button
              className="btn btn-primary px-lg-5 px-md-4 px-3"
              onClick={nextStep}
            >
              Next
            </button>
          )}
          {formStepNumber == 7 && (
            <button className="btn btn-primary px-lg-5 px-md-4 px-3">
              Submit
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
