"use client";

import React from "react";
import styles from "./footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="row">
        <div className="col-lg-3 col-md-3 mb-3">
          <p>Saral Sewa</p>
        </div>
        <div className="col-lg-2 col-md-3 mb-3">
          <div className="d-flex flex-column">
            <span>
              <a href="/about-us" target="_blank" rel="noopener noreferrer">
                About us
              </a>
            </span>
            <span>
              <a href="/contact-us" target="_blank" rel="noopener noreferrer">
                Contact us
              </a>
            </span>
            <span>
              <a href="/faq" target="_blank" rel="noopener noreferrer">
                FAQ's
              </a>
            </span>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 mb-3">
          <div className="d-flex flex-column">
            <span>
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </span>
            <span>
              <a href="/tnc" target="_blank" rel="noopener noreferrer">
                Terms & Condition
              </a>
            </span>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 mb-3">
          <div className="d-flex flex-column">
            <span className="d-flex align-items-center">
              <svg
                className="me-2"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.95 21C17.8667 21 15.8083 20.546 13.775 19.638C11.7417 18.73 9.89167 17.4423 8.225 15.775C6.55833 14.1077 5.271 12.2577 4.363 10.225C3.455 8.19233 3.00067 6.134 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07933 8.725 3.238C8.90833 3.39667 9.01667 3.584 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.704 12.1123 8.162 12.687C8.62 13.2617 9.12433 13.816 9.675 14.35C10.1917 14.8667 10.7333 15.346 11.3 15.788C11.8667 16.23 12.4667 16.634 13.1 17L15.45 14.65C15.6 14.5 15.796 14.3877 16.038 14.313C16.28 14.2383 16.5173 14.2173 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1377 20.775 15.313C20.925 15.4883 21 15.684 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z"
                  fill="white"
                />
              </svg>
              <a href="tel:+919899976227">+91 9899976227</a>
            </span>
            <span className="d-flex align-items-center">
              <svg
                className="me-2"
                width="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 20C3.45 20 2.97933 19.8043 2.588 19.413C2.19667 19.0217 2.00067 18.5507 2 18V6C2 5.45 2.196 4.97933 2.588 4.588C2.98 4.19667 3.45067 4.00067 4 4H20C20.55 4 21.021 4.196 21.413 4.588C21.805 4.98 22.0007 5.45067 22 6V18C22 18.55 21.8043 19.021 21.413 19.413C21.0217 19.805 20.5507 20.0007 20 20H4ZM12 13L20 8V6L12 11L4 6V8L12 13Z"
                  fill="white"
                />
              </svg>
              <a href="mailto:info@saralsewa.in">info@saralsewa.in</a>
            </span>
          </div>
        </div>
        <div className="col-lg-3 col-md-5 mb-3">
          <div className="d-flex flex-column">
            <span className="d-flex align-items-start">
              <svg
                className="me-2"
                width="24"
                viewBox="0 0 16 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.262 20.134C7.262 20.134 0 14.018 0 8C0 5.87827 0.842855 3.84344 2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8C16 14.018 8.738 20.134 8.738 20.134C8.334 20.506 7.669 20.502 7.262 20.134ZM8 11.5C8.45963 11.5 8.91475 11.4095 9.33939 11.2336C9.76403 11.0577 10.1499 10.7999 10.4749 10.4749C10.7999 10.1499 11.0577 9.76403 11.2336 9.33939C11.4095 8.91475 11.5 8.45963 11.5 8C11.5 7.54037 11.4095 7.08525 11.2336 6.66061C11.0577 6.23597 10.7999 5.85013 10.4749 5.52513C10.1499 5.20012 9.76403 4.94231 9.33939 4.76642C8.91475 4.59053 8.45963 4.5 8 4.5C7.07174 4.5 6.1815 4.86875 5.52513 5.52513C4.86875 6.1815 4.5 7.07174 4.5 8C4.5 8.92826 4.86875 9.8185 5.52513 10.4749C6.1815 11.1313 7.07174 11.5 8 11.5Z"
                  fill="white"
                />
              </svg>
              BATRA HOUSE, RANBAXY CORPORATE <br />
              HEADQUARTERS, Plot 52, Sector 32, Gurugram, Haryana 122001{" "}
            </span>
            <span className="d-flex align-items-center">
              <svg
                className="me-2"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19 3C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19ZM18.5 18.5V13.2C18.5 12.3354 18.1565 11.5062 17.5452 10.8948C16.9338 10.2835 16.1046 9.94 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17C14.6813 12.17 15.0374 12.3175 15.2999 12.5801C15.5625 12.8426 15.71 13.1987 15.71 13.57V18.5H18.5ZM6.88 8.56C7.32556 8.56 7.75288 8.383 8.06794 8.06794C8.383 7.75288 8.56 7.32556 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19C6.43178 5.19 6.00193 5.36805 5.68499 5.68499C5.36805 6.00193 5.19 6.43178 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56ZM8.27 18.5V10.13H5.5V18.5H8.27Z"
                  fill="white"
                />
              </svg>
              <a
                href="http://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Linkedin
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
