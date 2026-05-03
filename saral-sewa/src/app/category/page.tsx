"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./category.css";

export default function BrowseSchemePage() {
  const [sortingFilter, toggleSortingFilter] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const toggleFilter = (filterName: string) => {
    console.log("filterName");
    setActiveFilter((prev) => (prev === filterName ? null : filterName));
  };

  return (
    <section className="categorized-schemes">
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
      <h2 className="mb-4">Business & Entrepreneurship</h2>
      <div className="position-relative mb-5">
        <div className="filter-wrapper ">
          <div className="d-flex align-items-center">
            <a
              className={`nav-link ${activeFilter === "basic" ? "active" : ""}`}
              type="button"
              onClick={() => toggleFilter("basic")}
            >
              Basic information
            </a>
            <a
              className={`nav-link ${
                activeFilter === "special" ? "active" : ""
              }`}
              type="button"
              onClick={() => toggleFilter("special")}
            >
              Special Criteria
            </a>
            <a
              className={`nav-link ${activeFilter === "work" ? "active" : ""}`}
              type="button"
              onClick={() => toggleFilter("work")}
            >
              Work Status
            </a>
            <a
              className={`nav-link ${
                activeFilter === "scheme" ? "active" : ""
              }`}
              type="button"
              onClick={() => toggleFilter("scheme")}
            >
              Scheme Details
            </a>
            <button className="btn btn-outline-primary btn-lg ms-auto">
              Reset Filter
            </button>
          </div>
        </div>
        {activeFilter === "basic" && (
          <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
            <div className="filter-wrapper filter-dropdown w-100">
              <div className="row">
                <div className="col-lg-6">
                  <p className="my-3">State</p>
                  <div className="row">
                    <div className="col-md-4 col-6">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value=""
                          id="stateDelhi"
                        />
                        <label
                          className="form-check-label"
                          htmlFor="stateDelhi"
                        >
                          Delhi
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value=""
                          id="stateHaryana"
                        />
                        <label
                          className="form-check-label"
                          htmlFor="stateHaryana"
                        >
                          Haryana
                        </label>
                      </div>
                    </div>
                    <div className="col-md-4 col-6">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value=""
                          id="stateDelhi"
                        />
                        <label
                          className="form-check-label"
                          htmlFor="stateDelhi"
                        >
                          Delhi
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value=""
                          id="stateHaryana"
                        />
                        <label
                          className="form-check-label"
                          htmlFor="stateHaryana"
                        >
                          Haryana
                        </label>
                      </div>
                    </div>
                    <div className="col-md-4 col-6">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value=""
                          id="stateDelhi"
                        />
                        <label
                          className="form-check-label"
                          htmlFor="stateDelhi"
                        >
                          Delhi
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value=""
                          id="stateHaryana"
                        />
                        <label
                          className="form-check-label"
                          htmlFor="stateHaryana"
                        >
                          Haryana
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-2 col-lg-3 col-md-6">
                  <p className="my-3">Gender</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="allGender"
                    />
                    <label className="form-check-label" htmlFor="allGender">
                      All <span className="badge badge-primary ms-1">123</span>
                    </label>
                  </div>
                </div>
                <div className="col-xl-2 col-lg-3 col-md-6">
                  <p className="my-3">Age</p>
                  <select
                    name="ageFilter"
                    id="ageFilter"
                    className="form-control"
                  >
                    <option value="0" selected>
                      Select Age
                    </option>
                  </select>
                </div>
                <div className="col-xl-2 col-lg-3 col-md-6">
                  <p className="my-3">Caste</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="allCaste"
                    />
                    <label
                      className="form-check-label d-flex"
                      htmlFor="allCaste"
                    >
                      All <span className="badge badge-primary ms-1">123</span>
                    </label>
                  </div>
                </div>
                <div className="col-12 py-2 text-end">
                  <button className="btn btn-primary btn-lg">Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeFilter === "special" && (
          <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
            <div className="filter-wrapper filter-dropdown w-100">
              <div className="row">
                <div className="col-lg-3 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="DifferentlyAbled"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="DifferentlyAbled"
                    >
                      Differently Abled
                    </label>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="DisabilityPercentage"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="DisabilityPercentage"
                    >
                      Disability Percentage
                    </label>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="bpl"
                    />
                    <label className="form-check-label" htmlFor="bpl">
                      Below Poverty Line (BPL)
                    </label>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="EconomicDistress"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="EconomicDistress"
                    >
                      Economic Distress
                    </label>
                  </div>
                </div>
                <div className="col-12 py-2 text-end">
                  <button className="btn btn-primary btn-lg">Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeFilter === "work" && (
          <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
            <div className="filter-wrapper filter-dropdown w-100">
              <div className="row">
                <div className="col-lg-3 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="Governmentemplyee"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="Governmentemplyee"
                    >
                      Government emplyee
                    </label>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="Student"
                    />
                    <label className="form-check-label" htmlFor="Student">
                      Student
                    </label>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <p className="my-3">Employment Status</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="Unemployed"
                    />
                    <label className="form-check-label" htmlFor="Unemployed">
                      Unemployed
                    </label>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <p className="my-3">Occupation</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="Farmer"
                    />
                    <label className="form-check-label" htmlFor="Farmer">
                      Farmer
                    </label>
                  </div>
                </div>
                <div className="col-12 py-2 text-end">
                  <button className="btn btn-primary btn-lg">Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeFilter === "scheme" && (
          <div className="position-absolute top-100 left-0 right-0 w-100 z-1">
            <div className="filter-wrapper filter-dropdown w-100">
              <div className="row">
                <div className="col-xl-3 col-lg-4 col-md-6">
                  <p className="my-3">Scheme Category</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="Health"
                    />
                    <label className="form-check-label" htmlFor="Health">
                      Health
                    </label>
                  </div>
                </div>
                <div className="col-xl-3 col-lg-4 col-md-6">
                  <p className="my-3">Benefit Type</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="FinancialAssistance"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="FinancialAssistance"
                    >
                      Financial Assistance
                    </label>
                  </div>
                </div>
                <div className="col-xl-3 col-lg-4 col-md-6">
                  <p className="my-3">DBT Scheme</p>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="DirectBenefitTransfer"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="DirectBenefitTransfer"
                    >
                      Direct Benefit Transfer
                    </label>
                  </div>
                </div>
                <div className="col-12 py-2 text-end">
                  <button className="btn btn-primary btn-lg">Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="scheme-input-container" style={{ position: "relative" }}>
        <input type="text" placeholder="Search" />
        <span
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            cursor: "pointer",
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.3768 17.5H18.3893L18.0393 17.1625C18.8205 16.255 19.3914 15.186 19.7112 14.032C20.0311 12.8781 20.0919 11.6677 19.8893 10.4875C19.3018 7.01253 16.4018 4.23753 12.9018 3.81253C11.6713 3.65686 10.4215 3.78474 9.24808 4.18639C8.07463 4.58804 7.00861 5.2528 6.13159 6.12982C5.25457 7.00683 4.58981 8.07286 4.18816 9.24631C3.78651 10.4198 3.65863 11.6695 3.8143 12.9C4.2393 16.4 7.0143 19.3 10.4893 19.8875C11.6695 20.0901 12.8799 20.0293 14.0338 19.7095C15.1878 19.3896 16.2568 18.8187 17.1643 18.0375L17.5018 18.3875V19.375L22.8143 24.6875C23.3268 25.2 24.1643 25.2 24.6768 24.6875C25.1893 24.175 25.1893 23.3375 24.6768 22.825L19.3768 17.5ZM11.8768 17.5C8.7643 17.5 6.2518 14.9875 6.2518 11.875C6.2518 8.76253 8.7643 6.25003 11.8768 6.25003C14.9893 6.25003 17.5018 8.76253 17.5018 11.875C17.5018 14.9875 14.9893 17.5 11.8768 17.5Z"
              fill="#2C2C2C"
              fill-opacity="0.5"
            />
          </svg>
        </span>
      </div>
      <p
        className=" mb-4 d-flex align-items-center"
        style={{ color: "#2C2C2C80", fontSize: "18px" }}
      >
        <svg
          className="me-2"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.16797 5.83335H10.8346V7.50002H9.16797V5.83335ZM9.16797 9.16669H10.8346V14.1667H9.16797V9.16669ZM10.0013 1.66669C5.4013 1.66669 1.66797 5.40002 1.66797 10C1.66797 14.6 5.4013 18.3334 10.0013 18.3334C14.6013 18.3334 18.3346 14.6 18.3346 10C18.3346 5.40002 14.6013 1.66669 10.0013 1.66669ZM10.0013 16.6667C6.3263 16.6667 3.33464 13.675 3.33464 10C3.33464 6.32502 6.3263 3.33335 10.0013 3.33335C13.6763 3.33335 16.668 6.32502 16.668 10C16.668 13.675 13.6763 16.6667 10.0013 16.6667Z"
            fill="#2C2C2C"
            fill-opacity="0.5"
          />
        </svg>
        For an exact match, put the words in quotes. For example: "Scheme Name".
      </p>
      <ul className="nav nav-tabs" id="myTab" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className="nav-link active"
            id="all-schemes-tab"
            data-bs-toggle="tab"
            data-bs-target="#all-schemes"
            type="button"
            role="tab"
            aria-controls="all-schemes"
            aria-selected="true"
          >
            All Schemes
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className="nav-link"
            id="state-schemes-tab"
            data-bs-toggle="tab"
            data-bs-target="#state-schemes"
            type="button"
            role="tab"
            aria-controls="state-schemes"
            aria-selected="false"
          >
            State Schemes
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className="nav-link"
            id="central-schemes-tab"
            data-bs-toggle="tab"
            data-bs-target="#central-schemes"
            type="button"
            role="tab"
            aria-controls="central-schemes"
            aria-selected="false"
          >
            Central Schemes
          </button>
        </li>
      </ul>
      <div className="tab-content" id="myTabContent">
        <div
          className="tab-pane fade show active"
          id="all-schemes"
          role="tabpanel"
          aria-labelledby="all-schemes-tab"
        >
          <div className="d-flex align-items-center justify-content-between mb-3">
            <p style={{ color: "#2C2C2C80" }}>
              We found <span className="text-primary">63</span> schemes based on
              your preferences
            </p>
            <div className="dropdown">
              <div className="d-flex align-items-center">
                Sort:
                <a
                  className="ms-2 nav-link"
                  type="button"
                  onClick={() => toggleSortingFilter(!sortingFilter)}
                >
                  Relevance{" "}
                  <svg
                    className="ms-1"
                    width="24"
                    height="12"
                    viewBox="0 0 24 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_792_3956)">
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M12.7116 10.157L18.3686 4.5L16.9546 3.086L12.0046 8.036L7.05463 3.086L5.64062 4.5L11.2976 10.157C11.4852 10.3445 11.7395 10.4498 12.0046 10.4498C12.2698 10.4498 12.5241 10.3445 12.7116 10.157Z"
                        fill="black"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_792_3956">
                        <rect
                          width="12"
                          height="24"
                          fill="white"
                          transform="matrix(0 1 1 0 0 0)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                </a>
              </div>
              {sortingFilter && (
                <ul className="dropdown-menu show">
                  <li>
                    <a
                      className="dropdown-item"
                      type="button"
                      onClick={() => toggleSortingFilter(false)}
                    >
                      Latest
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      type="button"
                      onClick={() => toggleSortingFilter(false)}
                    >
                      Earliest
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      type="button"
                      onClick={() => toggleSortingFilter(false)}
                    >
                      Relevance
                    </a>
                  </li>
                </ul>
              )}
            </div>
          </div>
          <div className="scheme-overview-card">
            <div className="scheme-img-wrapper">
              <Image
                className="scheme-img"
                src="/imgs/finance-scheme-img.png"
                alt=""
                height={999}
                width={999}
              />
            </div>
            <div className="scheme-text-wrapper">
              <span className="scheme-title">
                Production Linked Incentive Scheme For Automobile And Auto
                Component Industry
              </span>
              <span className="scheme-department">
                Ministry of Heavy Industries
              </span>
              <span className="scheme-desc">
                The government of India has launched the scheme “Production
                Linked Incentive (PLI) Scheme for Automobile and Auto Components
                Industry” in India to enhance India’s Manufacturing Capabilities
                for Advanced Automotive Products.
              </span>
              <div className="d-flex-flex-wrap">
                <span className="scheme-tag">Auto Component</span>
                <span className="scheme-tag">Automobile</span>
                <span className="scheme-tag">Automotive</span>
                <span className="scheme-tag">Incentive</span>
              </div>
            </div>
          </div>
          <nav aria-label="Page navigation example">
            <ul className="pagination justify-content-center">
              <li className="page-item">
                <a className="page-link" href="#" aria-label="Previous">
                  <span aria-hidden="true">&laquo;</span>
                </a>
              </li>
              <li className="page-item">
                <a className="page-link active" href="#">
                  1
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">
                  2
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">
                  3
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">
                  4
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">
                  5
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">
                  6
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#" aria-label="Next">
                  <span aria-hidden="true">&raquo;</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div
          className="tab-pane fade"
          id="state-schemes"
          role="tabpanel"
          aria-labelledby="state-schemes-tab"
        >
          ...
        </div>
        <div
          className="tab-pane fade"
          id="central-schemes"
          role="tabpanel"
          aria-labelledby="central-schemes-tab"
        >
          ...
        </div>
      </div>
    </section>
  );
}
