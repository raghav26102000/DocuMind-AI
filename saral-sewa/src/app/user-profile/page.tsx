// app/user-profile/page.tsx
"use client";

import { useState, useEffect } from "react";

import UserDetails from "./UserDetails";
import DocumentUpload from "./DocumentUpload"; // Assuming this path
import "./user-profile.css"; // Keep your main styles here or in global styles

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  address: string;
  username: string;
  state: string;
  registered_on: string;
}

export default function UserProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!token) {
          throw new Error("No authentication token found");
        }

        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_BASE_URL;

        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Please login again.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 1) {
          setUserProfile(data.data);
        } else {
          throw new Error(data.message || "Failed to fetch profile");
        }
      } catch (err: any) {
        // Type 'any' for now, consider a more specific error type
        setError(err.message);
        console.error("Error fetching user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    setIsEditMode(false);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  if (loading) {
    return (
      <section>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Profile</h4>
          <p>{error}</p>
          <button
            className="btn btn-outline-danger"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex pb-5">
        <a href="/home" className="btn" style={{ fontSize: "24px" }}>
          {/* Back button SVG */}
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

      <div className="d-flex align-items-start w-100 mb-xl-5 mb-md-4 mb-3">
        <div className="me-3">
          <h1 className="page-heading">Profile</h1>
          <h3 className="page-subheading">Check your all details below</h3>
        </div>
        <button 
          className="btn border-0 ms-auto"
          onClick={toggleEditMode}
          disabled={loading}
        >
          {/* Edit button SVG */}
          <svg
            className="me-2"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18 2.9 17.35 2.9 16.96 3.29L15.12 5.12L18.87 8.87M3 17.25V21H6.75L17.81 9.93L14.06 6.18L3 17.25Z"
              fill="black"
            />
          </svg>
          {isEditMode ? 'Cancel Edit' : 'Edit'}
        </button>
      </div>

      {/* Render UserDetails component, passing the fetched profile data */}
      <UserDetails 
        userProfile={userProfile} 
        onProfileUpdate={handleProfileUpdate}
      />

      <div className="col-12 my-lg-5 my-md-4 my-3">
        <hr
          style={{
            backgroundColor: "#00000080",
            height: "1px",
            width: "100%",
          }}
        />
      </div>

      {/* Render DocumentUpload component */}
      <DocumentUpload />
    </section>
  );
}