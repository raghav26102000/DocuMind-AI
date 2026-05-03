"use client";

import { useEffect, useState } from "react";
import "./home.css";
import Image from "next/image";

export default function HomePage() {
  const [schemeCount, setSchemeCount] = useState<number>(0);

  useEffect(() => {
    const fetchSchemeCount = async () => {
      try {
        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_BASE_URL ;
        const res = await fetch(`${API_BASE_URL}/schemes/count`);
        if (!res.ok) throw new Error("API responded with error");
        const responseData = await res.json();
        console.log("Count API Response:", responseData); // Add this for debugging
        
        // Check if the API response indicates success
        if (responseData.status !== 1) {
          throw new Error(responseData.message || "Failed to fetch scheme count");
        }
        
        // Extract the count from responseData.data.count
        setSchemeCount(responseData.data?.count || 0);
      } catch (error) {
        console.error("❌ Failed to fetch schemes:", error);
      }
    };
  
    fetchSchemeCount();
  }, []);
  return (
    <section className="scheme-for">
      <h2 className="text-center">#GOVERNMENTSCHEMES /#SCHEMESFORYOU</h2>
      <div className="text-center">
        <button>
          Find Scheme for you
          <svg
            className="ml-2"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_54_785)">
              <path
                d="M20.364 11.293C20.5515 11.4806 20.6568 11.7349 20.6568 12C20.6568 12.2652 20.5515 12.5195 20.364 12.707L14.707 18.364C14.6148 18.4595 14.5044 18.5357 14.3824 18.5881C14.2604 18.6405 14.1292 18.6681 13.9964 18.6693C13.8636 18.6704 13.732 18.6451 13.6091 18.5948C13.4862 18.5446 13.3745 18.4703 13.2806 18.3764C13.1867 18.2825 13.1125 18.1709 13.0622 18.048C13.0119 17.9251 12.9866 17.7934 12.9878 17.6606C12.9889 17.5278 13.0165 17.3966 13.0689 17.2746C13.1213 17.1526 13.1975 17.0423 13.293 16.95L17.243 13H4.00001C3.7348 13 3.48044 12.8947 3.29291 12.7071C3.10537 12.5196 3.00001 12.2652 3.00001 12C3.00001 11.7348 3.10537 11.4805 3.29291 11.2929C3.48044 11.1054 3.7348 11 4.00001 11H17.243L13.293 7.05002C13.1109 6.86142 13.0101 6.60882 13.0123 6.34662C13.0146 6.08443 13.1198 5.83361 13.3052 5.6482C13.4906 5.4628 13.7414 5.35763 14.0036 5.35535C14.2658 5.35307 14.5184 5.45386 14.707 5.63602L20.364 11.293Z"
                fill="black"
              />
            </g>
            <defs>
              <clipPath id="clip0_54_785">
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
      <h2 className="text-center">
        Trusted by farmers, retailers, and businesses
      </h2>
      <div className="row mt-5">
        <div className="col-lg-4 col-md-6">
          <div className="user-type-card">
            <Image
              src="/imgs/stat-img1.png"
              alt=""
              width={9999}
              height={9999}
            />
            <div className="card-text">
              <span className="scheme-number">{schemeCount}</span>
              <span className="scheme-user">
                Government <br />
                Schemes
              </span>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6">
          <div className="user-type-card">
            <Image
              src="/imgs/stat-img2.png"
              alt=""
              width={9999}
              height={9999}
            />

            <div className="card-text">
              <span className="scheme-number">50+</span>
              <span className="scheme-user">
                Forms <br />
                Completed
              </span>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6">
          <div className="user-type-card">
            <Image
              src="/imgs/stat-img3.png"
              alt=""
              width={9999}
              height={9999}
            />

            <div className="card-text">
              <span className="scheme-number">95%</span>
              <span className="scheme-user">
                Success <br /> Rate
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
