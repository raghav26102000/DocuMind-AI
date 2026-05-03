"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import "./scheme-overview.css";
export default function HeroSection() {
  return (
    <div>
      <section className="hero-section">
        <div className="hero-text">
          <h1>Business & Entrepreneurship</h1>
          <div>
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.0003 25.55C13.8642 25.55 13.7378 25.5403 13.6212 25.5208C13.5045 25.5014 13.3878 25.4722 13.2712 25.4333C10.6462 24.5583 8.55588 22.9398 7.00033 20.5777C5.44477 18.2156 4.66699 15.673 4.66699 12.95V7.4375C4.66699 6.95139 4.80816 6.51389 5.09049 6.125C5.37283 5.73611 5.73721 5.45416 6.18366 5.27916L13.1837 2.65416C13.4559 2.55694 13.7281 2.50833 14.0003 2.50833C14.2725 2.50833 14.5448 2.55694 14.817 2.65416L21.817 5.27916C22.2642 5.45416 22.629 5.73611 22.9113 6.125C23.1937 6.51389 23.3344 6.95139 23.3337 7.4375V12.95C23.3337 15.6722 22.5559 18.2148 21.0003 20.5777C19.4448 22.9406 17.3545 24.5591 14.7295 25.4333C14.6128 25.4722 14.4962 25.5014 14.3795 25.5208C14.2628 25.5403 14.1364 25.55 14.0003 25.55Z"
                fill="#17B042"
              />
              <path
                d="M9.40625 14.6562L12.4688 17.7188L18.5938 11.1562"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Your application will be given directly to govt
          </div>
          <button
            className="btn btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#checkEligibilityModal"
          >
            Check Eligibility
            <svg
              className="ms-2"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_352_13401)">
                <path
                  d="M20.3644 11.293C20.5519 11.4805 20.6572 11.7348 20.6572 12C20.6572 12.2652 20.5519 12.5195 20.3644 12.707L14.7074 18.364C14.6152 18.4595 14.5048 18.5357 14.3828 18.5881C14.2608 18.6405 14.1296 18.6681 13.9968 18.6692C13.8641 18.6704 13.7324 18.6451 13.6095 18.5948C13.4866 18.5445 13.3749 18.4703 13.281 18.3764C13.1872 18.2825 13.1129 18.1708 13.0626 18.0479C13.0123 17.9251 12.987 17.7934 12.9882 17.6606C12.9893 17.5278 13.0169 17.3966 13.0693 17.2746C13.1217 17.1526 13.1979 17.0422 13.2934 16.95L17.2434 13H4.00044C3.73522 13 3.48087 12.8946 3.29333 12.7071C3.1058 12.5196 3.00044 12.2652 3.00044 12C3.00044 11.7348 3.1058 11.4804 3.29333 11.2929C3.48087 11.1054 3.73522 11 4.00044 11H17.2434L13.2934 7.04999C13.1113 6.86139 13.0105 6.60879 13.0128 6.34659C13.015 6.0844 13.1202 5.83358 13.3056 5.64817C13.491 5.46277 13.7418 5.3576 14.004 5.35532C14.2662 5.35304 14.5188 5.45383 14.7074 5.63599L20.3644 11.293Z"
                  fill="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_352_13401">
                  <rect
                    width="24"
                    height="24"
                    fill="white"
                    transform="matrix(0 -1 -1 0 24 24)"
                  />
                </clipPath>
              </defs>
            </svg>
          </button>
        </div>
      </section>
      <section className="scheme-overview-detail">
        <div className="row">
          <div className="col-xl-8 col-md-7">
            <div className="saral-authorized">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.0003 25.55C13.8642 25.55 13.7378 25.5403 13.6212 25.5208C13.5045 25.5014 13.3878 25.4722 13.2712 25.4333C10.6462 24.5583 8.55588 22.9398 7.00033 20.5777C5.44477 18.2156 4.66699 15.673 4.66699 12.95V7.4375C4.66699 6.95139 4.80816 6.51389 5.09049 6.125C5.37283 5.73611 5.73721 5.45417 6.18366 5.27917L13.1837 2.65417C13.4559 2.55694 13.7281 2.50833 14.0003 2.50833C14.2725 2.50833 14.5448 2.55694 14.817 2.65417L21.817 5.27917C22.2642 5.45417 22.629 5.73611 22.9113 6.125C23.1937 6.51389 23.3344 6.95139 23.3337 7.4375V12.95C23.3337 15.6722 22.5559 18.2148 21.0003 20.5777C19.4448 22.9406 17.3545 24.5591 14.7295 25.4333C14.6128 25.4722 14.4962 25.5014 14.3795 25.5208C14.2628 25.5403 14.1364 25.55 14.0003 25.55Z"
                  fill="#2279E4"
                />
                <path
                  d="M9.40625 14.6562L12.4688 17.7188L18.5938 11.1562"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Saral Seva is authorized by the Government of India
            </div>
            <h2>Scheme Application Information</h2>
            <div className="row mb-lg-5 mb-md-4 mb-3">
              <div className="col-sm-6 mb-3">
                <div className="d-flex align-items-center h-100 w-100 application-info">
                  <svg
                    className="me-3"
                    width="76"
                    height="79"
                    viewBox="0 0 76 79"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 10C0 4.47715 4.47715 0 10 0H66C71.5229 0 76 4.47715 76 10V69C76 74.5229 71.5229 79 66 79H10C4.47715 79 0 74.5229 0 69V10Z"
                      fill="#ECEAFF"
                    />
                    <path
                      d="M36 22C33.812 22 31.7135 22.8692 30.1664 24.4164C28.6192 25.9635 27.75 28.062 27.75 30.25C27.75 32.438 28.6192 34.5365 30.1664 36.0836C31.7135 37.6308 33.812 38.5 36 38.5C38.188 38.5 40.2865 37.6308 41.8336 36.0836C43.3808 34.5365 44.25 32.438 44.25 30.25C44.25 28.062 43.3808 25.9635 41.8336 24.4164C40.2865 22.8692 38.188 22 36 22ZM30 40C28.0109 40 26.1032 40.7902 24.6967 42.1967C23.2902 43.6032 22.5 45.5109 22.5 47.5V52H49.5V47.5C49.5 45.5109 48.7098 43.6032 47.3033 42.1967C45.8968 40.7902 43.9891 40 42 40H39.927L36 47.854L32.073 40H30Z"
                      fill="#2822E4"
                    />
                  </svg>

                  <div className="d-flex flex-column ">
                    <p>Scheme type</p>
                    <span>Business </span>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 mb-3">
                <div className="d-flex align-items-center h-100 w-100 application-info">
                  <svg
                    className="me-3"
                    width="76"
                    height="79"
                    viewBox="0 0 76 79"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 10C0 4.47715 4.47715 0 10 0H66C71.5229 0 76 4.47715 76 10V69C76 74.5229 71.5229 79 66 79H10C4.47715 79 0 74.5229 0 69V10Z"
                      fill="#EAF6FF"
                    />
                    <path
                      d="M31.6247 21.75C31.6247 21.4516 31.5061 21.1655 31.2952 20.9545C31.0842 20.7435 30.798 20.625 30.4997 20.625C30.2013 20.625 29.9151 20.7435 29.7042 20.9545C29.4932 21.1655 29.3747 21.4516 29.3747 21.75V24.12C27.2147 24.2925 25.7987 24.7155 24.7577 25.758C23.7152 26.799 23.2922 28.2165 23.1182 30.375H52.8812C52.7072 28.215 52.2842 26.799 51.2417 25.758C50.2007 24.7155 48.7832 24.2925 46.6247 24.1185V21.75C46.6247 21.4516 46.5061 21.1655 46.2952 20.9545C46.0842 20.7435 45.798 20.625 45.4997 20.625C45.2013 20.625 44.9151 20.7435 44.7042 20.9545C44.4932 21.1655 44.3747 21.4516 44.3747 21.75V24.0195C43.3772 24 42.2582 24 40.9997 24H34.9997C33.7412 24 32.6222 24 31.6247 24.0195V21.75Z"
                      fill="#2279E4"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M23 36C23 34.7415 23 33.6225 23.0195 32.625H52.9805C53 33.6225 53 34.7415 53 36V39C53 44.6565 53 47.4855 51.242 49.242C49.484 50.9985 46.6565 51 41 51H35C29.3435 51 26.5145 51 24.758 49.242C23.0015 47.484 23 44.6565 23 39V36ZM45.5 39C45.8978 39 46.2794 38.842 46.5607 38.5607C46.842 38.2794 47 37.8978 47 37.5C47 37.1022 46.842 36.7206 46.5607 36.4393C46.2794 36.158 45.8978 36 45.5 36C45.1022 36 44.7206 36.158 44.4393 36.4393C44.158 36.7206 44 37.1022 44 37.5C44 37.8978 44.158 38.2794 44.4393 38.5607C44.7206 38.842 45.1022 39 45.5 39ZM45.5 45C45.8978 45 46.2794 44.842 46.5607 44.5607C46.842 44.2794 47 43.8978 47 43.5C47 43.1022 46.842 42.7206 46.5607 42.4393C46.2794 42.158 45.8978 42 45.5 42C45.1022 42 44.7206 42.158 44.4393 42.4393C44.158 42.7206 44 43.1022 44 43.5C44 43.8978 44.158 44.2794 44.4393 44.5607C44.7206 44.842 45.1022 45 45.5 45ZM39.5 37.5C39.5 37.8978 39.342 38.2794 39.0607 38.5607C38.7794 38.842 38.3978 39 38 39C37.6022 39 37.2206 38.842 36.9393 38.5607C36.658 38.2794 36.5 37.8978 36.5 37.5C36.5 37.1022 36.658 36.7206 36.9393 36.4393C37.2206 36.158 37.6022 36 38 36C38.3978 36 38.7794 36.158 39.0607 36.4393C39.342 36.7206 39.5 37.1022 39.5 37.5ZM39.5 43.5C39.5 43.8978 39.342 44.2794 39.0607 44.5607C38.7794 44.842 38.3978 45 38 45C37.6022 45 37.2206 44.842 36.9393 44.5607C36.658 44.2794 36.5 43.8978 36.5 43.5C36.5 43.1022 36.658 42.7206 36.9393 42.4393C37.2206 42.158 37.6022 42 38 42C38.3978 42 38.7794 42.158 39.0607 42.4393C39.342 42.7206 39.5 43.1022 39.5 43.5ZM30.5 39C30.8978 39 31.2794 38.842 31.5607 38.5607C31.842 38.2794 32 37.8978 32 37.5C32 37.1022 31.842 36.7206 31.5607 36.4393C31.2794 36.158 30.8978 36 30.5 36C30.1022 36 29.7206 36.158 29.4393 36.4393C29.158 36.7206 29 37.1022 29 37.5C29 37.8978 29.158 38.2794 29.4393 38.5607C29.7206 38.842 30.1022 39 30.5 39ZM30.5 45C30.8978 45 31.2794 44.842 31.5607 44.5607C31.842 44.2794 32 43.8978 32 43.5C32 43.1022 31.842 42.7206 31.5607 42.4393C31.2794 42.158 30.8978 42 30.5 42C30.1022 42 29.7206 42.158 29.4393 42.4393C29.158 42.7206 29 43.1022 29 43.5C29 43.8978 29.158 44.2794 29.4393 44.5607C29.7206 44.842 30.1022 45 30.5 45Z"
                      fill="#2279E4"
                    />
                  </svg>

                  <div className="d-flex flex-column">
                    <p>Length of Stay</p>
                    <span>30 days</span>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 mb-3">
                <div className="d-flex align-items-center h-100 w-100 application-info">
                  <svg
                    className="me-3"
                    width="76"
                    height="79"
                    viewBox="0 0 76 79"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 10C0 4.47715 4.47715 0 10 0H66C71.5229 0 76 4.47715 76 10V69C76 74.5229 71.5229 79 66 79H10C4.47715 79 0 74.5229 0 69V10Z"
                      fill="#E5FFEC"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M21 40C21 31.7155 27.7155 25 36 25C44.2845 25 51 31.7155 51 40C51 48.2845 44.2845 55 36 55C27.7155 55 21 48.2845 21 40ZM36 34C36 33.6022 35.842 33.2206 35.5607 32.9393C35.2794 32.658 34.8978 32.5 34.5 32.5C34.1022 32.5 33.7206 32.658 33.4393 32.9393C33.158 33.2206 33 33.6022 33 34V41.5C33 41.8978 33.158 42.2794 33.4393 42.5607C33.7206 42.842 34.1022 43 34.5 43H42C42.3978 43 42.7794 42.842 43.0607 42.5607C43.342 42.2794 43.5 41.8978 43.5 41.5C43.5 41.1022 43.342 40.7206 43.0607 40.4393C42.7794 40.158 42.3978 40 42 40H36V34Z"
                      fill="#17B042"
                    />
                  </svg>

                  <div className="d-flex flex-column">
                    <p>Validity</p>
                    <span>90 days</span>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 mb-3">
                <div className="d-flex align-items-center h-100 w-100 application-info">
                  <svg
                    className="me-3"
                    width="76"
                    height="79"
                    viewBox="0 0 76 79"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 10C0 4.47715 4.47715 0 10 0H66C71.5229 0 76 4.47715 76 10V69C76 74.5229 71.5229 79 66 79H10C4.47715 79 0 74.5229 0 69V10Z"
                      fill="#FFEAF8"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M35.75 28.0403C35.7501 27.9215 35.7784 27.8044 35.8326 27.6987C35.8867 27.593 35.9653 27.5017 36.0616 27.4323C36.158 27.3629 36.2695 27.3173 36.3869 27.2994C36.5043 27.2815 36.6243 27.2917 36.737 27.3293L46.487 30.579C46.6364 30.6288 46.7664 30.7243 46.8584 30.8521C46.9505 30.9798 47 31.1333 47 31.2908V52.7093C47 52.8667 46.9505 53.0202 46.8584 53.148C46.7664 53.2757 46.6364 53.3713 46.487 53.421L36.737 56.6708C36.6243 56.7083 36.5043 56.7185 36.3869 56.7006C36.2695 56.6827 36.158 56.6372 36.0616 56.5677C35.9653 56.4983 35.8867 56.407 35.8326 56.3013C35.7784 56.1956 35.7501 56.0785 35.75 55.9598V53.25H29V30H35.75V28.0403ZM40.25 41.25C40.25 42.0788 39.914 42.75 39.5 42.75C39.086 42.75 38.75 42.0788 38.75 41.25C38.75 40.4213 39.086 39.75 39.5 39.75C39.914 39.75 40.25 40.4213 40.25 41.25ZM35.75 31.5H30.5V51.75H35.75V31.5Z"
                      fill="#EE06A4"
                    />
                  </svg>

                  <div className="d-flex flex-column">
                    <p>Entry</p>
                    <span>Single</span>
                  </div>
                </div>
              </div>
            </div>
            <h2>How Kerela Scheme Process Works</h2>
            <div className="scheme-steps">
              <div className="row mb-lg-5 mb-md-4 mb-3">
                <div className="col-1 py-4">
                  <div className="vr-line"></div>
                </div>
                <div className="col-11">
                  <div className="scheme-step-box">
                    <span className="step-number">Step 1</span>
                    <span className="step-name">Apply on SaralSeva</span>
                    <span className="step-desx">
                      Submit your documents on SaralSeva — only pay government
                      fee.
                    </span>
                  </div>
                  <div className="scheme-step-box">
                    <span className="step-number">Step 2</span>
                    <span className="step-name">
                      Your Documents Are Verified
                    </span>
                    <span className="step-desx">
                      SaralSeva verifies your documents and submits to Scheme
                      Department
                    </span>
                  </div>
                  <div className="scheme-step-box">
                    <span className="step-number">Step 3</span>
                    <span className="step-name">
                      Your Scheme Gets Processed
                    </span>
                    <span className="step-desx">
                      We work with Immigration to ensure you get your Scheme on
                      time.
                    </span>
                  </div>
                  <div className="scheme-step-box">
                    <span className="step-number">Step 4</span>
                    <span className="step-name">
                      Get Your Scheme on 14 Jul, 10:00 AM
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <h2>Kerela Scheme Rejection Reasons</h2>
            <h4 className="fw-normal">
              Factors that can get your scheme rejected
            </h4>
            <div className="rejection-reason-wrapper">
              <div className="rejection-reason">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21.75 12C21.75 14.5859 20.7228 17.0658 18.8943 18.8943C17.0658 20.7228 14.5859 21.75 12 21.75M21.75 12C21.75 9.41414 20.7228 6.93419 18.8943 5.10571C17.0658 3.27723 14.5859 2.25 12 2.25M21.75 12C21.75 14.4855 17.385 16.5 12 16.5C6.615 16.5 2.25 14.4855 2.25 12M21.75 12C21.75 9.5145 17.385 7.5 12 7.5C6.615 7.5 2.25 9.5145 2.25 12M12 21.75C9.41414 21.75 6.93419 20.7228 5.10571 18.8943C3.27723 17.0658 2.25 14.5859 2.25 12M12 21.75C14.4855 21.75 16.5 17.385 16.5 12C16.5 6.615 14.4855 2.25 12 2.25M12 21.75C9.5145 21.75 7.5 17.385 7.5 12C7.5 6.615 9.5145 2.25 12 2.25M12 2.25C9.41414 2.25 6.93419 3.27723 5.10571 5.10571C3.27723 6.93419 2.25 9.41414 2.25 12"
                    stroke="black"
                  />
                </svg>
                <div className="d-flex flex-column">
                  <span className="rejection-name">Expired Scheme</span>
                  <span className="rejection-desc">
                    Applying with a Scheme that has expired or expires within on
                    the last date
                  </span>
                </div>
              </div>
              <div className="rejection-reason">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="0.5" y="0.5" width="19" height="19" stroke="black" />
                  <line
                    x1="4.66699"
                    y1="0.833374"
                    x2="4.66699"
                    y2="20"
                    stroke="black"
                  />
                  <line
                    x1="9.66699"
                    y1="0.833374"
                    x2="9.66699"
                    y2="20"
                    stroke="black"
                  />
                  <line
                    x1="14.667"
                    y1="0.833374"
                    x2="14.667"
                    y2="20"
                    stroke="black"
                  />
                </svg>

                <div className="d-flex flex-column">
                  <span className="rejection-name">Criminal Record</span>
                  <span className="rejection-desc">
                    Having a criminal history that disqualifies you from
                    obtaining a scheme.
                  </span>
                </div>
              </div>
              <div className="rejection-reason">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 16H12.008M12 8V13M3.23005 7.913L7.91005 3.23C8.06005 3.08 8.26005 3 8.48005 3H15.53C15.74 3 15.95 3.08 16.1 3.23L20.77 7.903C20.92 8.053 21 8.253 21 8.473V15.527C21 15.737 20.92 15.947 20.77 16.097L16.1 20.77C15.95 20.92 15.75 21 15.53 21H8.47005C8.36456 21.0011 8.2599 20.9814 8.16208 20.9419C8.06425 20.9025 7.9752 20.844 7.90005 20.77L3.23005 16.097C3.15602 16.0218 3.09759 15.9328 3.05812 15.835C3.01865 15.7371 2.99891 15.6325 3.00005 15.527V8.473C3.00005 8.263 3.08005 8.053 3.23005 7.903V7.913Z"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="d-flex flex-column">
                  <span className="rejection-name">
                    Previous Scheme Violations
                  </span>
                  <span className="rejection-desc">
                    Having overstayed or violated the terms of a previous
                    scheme.
                  </span>
                </div>
              </div>
            </div>
            <h2>Frequent Ask question </h2>

            <div className="scheme-input-container">
              <input type="text" placeholder="Smart AI ask me anything" />
              <div>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.5 14H14.71L14.43 13.73C15.444 12.5541 16.0012 11.0527 16 9.5C16 8.21442 15.6188 6.95772 14.9046 5.8888C14.1903 4.81988 13.1752 3.98676 11.9874 3.49479C10.7997 3.00282 9.49279 2.87409 8.23192 3.1249C6.97104 3.3757 5.81285 3.99477 4.90381 4.90381C3.99477 5.81285 3.3757 6.97104 3.1249 8.23192C2.87409 9.49279 3.00282 10.7997 3.49479 11.9874C3.98676 13.1752 4.81988 14.1903 5.8888 14.9046C6.95772 15.6188 8.21442 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z"
                    fill="black"
                  />
                </svg>
              </div>
            </div>
            <div className="accordion" id="faqAccordion">
              <div className="accordion-item">
                <h3 className="accordion-header" id="headingOne">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseOne"
                    aria-expanded="false"
                    aria-controls="collapseOne"
                  >
                    What do you need a scheme for Kerela?
                  </button>
                </h3>
                <div
                  id="collapseOne"
                  className="accordion-collapse collapse "
                  aria-labelledby="headingOne"
                  data-bs-parent="#accordionExample"
                >
                  <div className="accordion-body"></div>
                </div>
              </div>
              <div className="accordion-item">
                <h3 className="accordion-header" id="headingTwo">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseTwo"
                    aria-expanded="false"
                    aria-controls="collapseTwo"
                  >
                    What does an Kerela e-visa look like?
                  </button>
                </h3>
                <div
                  id="collapseTwo"
                  className="accordion-collapse collapse "
                  aria-labelledby="headingTwo"
                  data-bs-parent="#accordionExample"
                >
                  <div className="accordion-body"></div>
                </div>
              </div>
              <div className="accordion-item">
                <h3 className="accordion-header" id="headingThree">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseThree"
                    aria-expanded="false"
                    aria-controls="collapseThree"
                  >
                    What does an Kerela e-visa look like?
                  </button>
                </h3>
                <div
                  id="collapseThree"
                  className="accordion-collapse collapse "
                  aria-labelledby="headingThree"
                  data-bs-parent="#accordionExample"
                >
                  <div className="accordion-body"></div>
                </div>
              </div>
              <div className="accordion-item">
                <h3 className="accordion-header" id="headingFour">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseFour"
                    aria-expanded="false"
                    aria-controls="collapseFour"
                  >
                    What does an Kerela e-visa look like?
                  </button>
                </h3>
                <div
                  id="collapseFour"
                  className="accordion-collapse collapse "
                  aria-labelledby="headingFour"
                  data-bs-parent="#accordionExample"
                >
                  <div className="accordion-body"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-4 col-md-5">
            <div className="include-box my-4 my-md-0">
              <h5>What Included</h5>
              <div className="row mb-2">
                <div className="col-12 mb-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="mb-0">
                      <svg
                        className="me-2"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15.5 12C15.5 11.6022 15.658 11.2206 15.9393 10.9393C16.2206 10.658 16.6022 10.5 17 10.5C17.3978 10.5 17.7794 10.658 18.0607 10.9393C18.342 11.2206 18.5 11.6022 18.5 12C18.5 12.3978 18.342 12.7794 18.0607 13.0607C17.7794 13.342 17.3978 13.5 17 13.5C16.6022 13.5 16.2206 13.342 15.9393 13.0607C15.658 12.7794 15.5 12.3978 15.5 12Z"
                          fill="#2279E4"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M20.4406 6.674C20.1117 5.90147 19.5822 5.2309 18.9071 4.73175C18.2319 4.23259 17.4356 3.92299 16.6006 3.835L15.9486 3.767C12.6564 3.42053 9.33572 3.44334 6.04857 3.835L5.61657 3.886C4.80502 3.98235 4.04863 4.34611 3.46668 4.9199C2.88474 5.4937 2.51036 6.24489 2.40257 7.055C1.96477 10.3371 1.96477 13.6629 2.40257 16.945C2.51036 17.7551 2.88474 18.5063 3.46668 19.0801C4.04863 19.6539 4.80502 20.0177 5.61657 20.114L6.04857 20.165C9.33557 20.557 12.6556 20.58 15.9486 20.233L16.6006 20.165C17.4356 20.077 18.2319 19.7674 18.9071 19.2683C19.5822 18.7691 20.1117 18.0985 20.4406 17.326C20.9588 17.1724 21.4208 16.8705 21.7697 16.4576C22.1185 16.0446 22.3388 15.5387 22.4036 15.002C22.6366 13.008 22.6366 10.992 22.4036 8.998C22.3388 8.46135 22.1185 7.95536 21.7697 7.54241C21.4208 7.12946 20.9588 6.82759 20.4406 6.674ZM15.7906 5.258C12.6097 4.92421 9.40153 4.94635 6.22557 5.324L5.79357 5.376C5.31285 5.43305 4.86479 5.64849 4.52004 5.98835C4.1753 6.3282 3.95348 6.77314 3.88957 7.253C3.47045 10.4038 3.47045 13.5962 3.88957 16.747C3.95348 17.2269 4.1753 17.6718 4.52004 18.0117C4.86479 18.3515 5.31285 18.5669 5.79357 18.624L6.22557 18.676C9.40157 19.054 12.6106 19.076 15.7916 18.742L16.4436 18.673C17.2718 18.5867 18.0337 18.181 18.5676 17.542C17.0583 17.6295 15.5443 17.59 14.0416 17.424C13.4204 17.3554 12.8407 17.0788 12.3967 16.6391C11.9526 16.1994 11.6703 15.6224 11.5956 15.002C11.3637 13.0074 11.3637 10.9926 11.5956 8.998C11.6703 8.37757 11.9526 7.80064 12.3967 7.36094C12.8407 6.92124 13.4204 6.64461 14.0416 6.576C15.5443 6.41002 17.0583 6.37055 18.5676 6.458C18.0337 5.81902 17.2718 5.4133 16.4436 5.327L15.7906 5.258ZM19.2766 8.015L19.2786 8.026L19.2846 8.066L19.4836 8.034C19.5862 8.044 19.6889 8.055 19.7916 8.067C20.3786 8.132 20.8466 8.597 20.9136 9.172C21.1336 11.051 21.1336 12.949 20.9136 14.828C20.8781 15.1116 20.7481 15.3749 20.5445 15.5754C20.3409 15.7759 20.0756 15.9019 19.7916 15.933C19.6889 15.945 19.5862 15.956 19.4836 15.966L19.2846 15.935L19.2786 15.974L19.2766 15.985C17.5986 16.137 15.8766 16.12 14.2076 15.933C13.9235 15.9019 13.6582 15.7759 13.4546 15.5754C13.251 15.3749 13.121 15.1116 13.0856 14.828C12.8654 12.9491 12.8654 11.0509 13.0856 9.172C13.121 8.88844 13.251 8.62512 13.4546 8.4246C13.6582 8.22409 13.9235 8.0981 14.2076 8.067C15.8916 7.88061 17.5891 7.86319 19.2766 8.015Z"
                          fill="#2279E4"
                        />
                      </svg>
                      Government Fee
                    </p>
                    <span>₹200 x 1</span>
                  </div>
                </div>
                <div className="col-12 mb-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="mb-0">
                      <svg
                        className="me-2"
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14 3.25833C14.1809 3.25833 14.3683 3.28989 14.5645 3.35989L21.5439 5.97708V5.97806C21.8573 6.10076 22.1066 6.29315 22.3047 6.56595C22.4924 6.82467 22.5845 7.10694 22.584 7.43607V12.9497C22.584 15.5194 21.8523 17.92 20.374 20.1656C18.9088 22.3912 16.9536 23.9025 14.4922 24.7222C14.4113 24.7492 14.3323 24.7681 14.2559 24.7808C14.1855 24.7925 14.1007 24.8003 14 24.8003C13.8993 24.8003 13.8144 24.7925 13.7441 24.7808C13.6679 24.7681 13.5895 24.7491 13.5088 24.7222C11.0473 23.9017 9.09217 22.3903 7.62695 20.1656C6.14875 17.9209 5.41699 15.5202 5.41699 12.9497V7.43704C5.41708 7.10758 5.5093 6.82497 5.69727 6.56595C5.89462 6.29412 6.14163 6.10073 6.45215 5.97806L13.4346 3.35989L13.4355 3.36087C13.6317 3.2908 13.819 3.25837 14 3.25833Z"
                          stroke="#2279E4"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M9.40625 14.6562L12.4688 17.7188L18.5938 11.1562"
                          stroke="#2279E4"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Saral Seva Fee
                    </p>
                    <span>₹50 ₹0 for now</span>
                  </div>
                </div>
              </div>
              <div className="payment-condition">
                No advance payment. Pay only when you get your scheme
              </div>
              <button
                className="btn btn-primary p-3 w-100"
                data-bs-toggle="modal"
                data-bs-target="#checkEligibilityModal"
              >
                Check Eligibility
                <svg
                  className="ms-2"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_352_13409)">
                    <path
                      d="M20.3644 11.293C20.5519 11.4805 20.6572 11.7348 20.6572 12C20.6572 12.2652 20.5519 12.5195 20.3644 12.707L14.7074 18.364C14.6152 18.4595 14.5048 18.5357 14.3828 18.5881C14.2608 18.6405 14.1296 18.6681 13.9968 18.6692C13.8641 18.6704 13.7324 18.6451 13.6095 18.5948C13.4866 18.5445 13.3749 18.4703 13.281 18.3764C13.1872 18.2825 13.1129 18.1708 13.0626 18.0479C13.0123 17.9251 12.987 17.7934 12.9882 17.6606C12.9893 17.5278 13.0169 17.3966 13.0693 17.2746C13.1217 17.1526 13.1979 17.0422 13.2934 16.95L17.2434 13H4.00044C3.73522 13 3.48087 12.8946 3.29333 12.7071C3.1058 12.5196 3.00044 12.2652 3.00044 12C3.00044 11.7348 3.1058 11.4804 3.29333 11.2929C3.48087 11.1054 3.73522 11 4.00044 11H17.2434L13.2934 7.04999C13.1113 6.86139 13.0105 6.60879 13.0128 6.34659C13.015 6.0844 13.1202 5.83358 13.3056 5.64817C13.491 5.46277 13.7418 5.3576 14.004 5.35532C14.2662 5.35304 14.5188 5.45383 14.7074 5.63599L20.3644 11.293Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_352_13409">
                      <rect
                        width="24"
                        height="24"
                        fill="white"
                        transform="matrix(0 -1 -1 0 24 24)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
      <div
        className="modal fade"
        id="checkEligibilityModal"
        aria-labelledby="checkEligibilityModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
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
                Production Linked Incentive Scheme For Automobile And Auto
                Component Industry
              </h4>
              <div className="form-group">
                <p className="mb-3">
                  Please select one of the following categories:*
                </p>
                <div className="px-3 py-2 border rounded-2 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="flexRadioDefault"
                      id="flexRadioDefault1"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="flexRadioDefault1"
                    >
                      Company(ies) with an Existing Presence in the Automotive
                      Sector
                    </label>
                  </div>
                </div>
                <div className="px-3 py-2 border rounded-2 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="flexRadioDefault"
                      id="flexRadioDefault2"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="flexRadioDefault2"
                    >
                      New Non-Automotive Investor Company(ies)
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary">
                Submit
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                data-bs-dismiss="modal"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
