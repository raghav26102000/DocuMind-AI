// apiClient.ts
import { authStateManager, getAuthHeaders, tokenManager } from "./utils/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface ApiError {
  message: string;
  status?: number;
  response?: any;
}

export class ApiRequestError extends Error implements ApiError {
  status?: number;
  response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.response = response;
  }
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Add auth headers if available
  const authHeaders = getAuthHeaders();
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...options.headers,
  };
  console.log("🔍 Debug - Auth headers being sent:", authHeaders);
  console.log("🔍 Debug - Full headers:", headers);
  console.log("🔍 Debug - Current token:", tokenManager.getToken());
  console.log(
    "🔍 Debug - Token valid:",
    tokenManager.isValidToken(tokenManager.getToken() || "")
  );

  console.log("🌐 API Request:", {
    method: options.method || "GET",
    url,
    headers,
    body: options.body ? JSON.parse(options.body as string) : undefined,
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log("📡 API Response Status:", response.status);

    // Try to parse response as JSON
    let responseData;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log("📡 API Response Data:", responseData);

    if (!response.ok) {
      console.error("❌ API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      // Handle authentication errors
      if (response.status === 401) {
        console.log("🔓 Authentication failed, logging out user");
        authStateManager.logout();
      }

      // Create a detailed error message
      let errorMessage = `Request failed with status ${response.status}`;

      if (responseData) {
        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData.detail) {
          if (typeof responseData.detail === "string") {
            errorMessage = responseData.detail;
          } else if (Array.isArray(responseData.detail)) {
            errorMessage = responseData.detail
              .map((err: any) => `${err.loc?.join(".") || "Field"}: ${err.msg}`)
              .join(", ");
          }
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      }

      throw new ApiRequestError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    console.error("❌ API Request Error:", error);

    if (error instanceof ApiRequestError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiRequestError(
        "Network error: Unable to connect to server",
        0,
        null
      );
    }

    // Handle other errors
    throw new ApiRequestError(
      error instanceof Error ? error.message : "An unexpected error occurred",
      0,
      null
    );
  }
}

// Specific API methods for better type safety
export const authAPI = {
  sendOTP: async (phone: string, action: "register" | "login") => {
    return apiRequest("/auth/otp", {
      method: "POST",
      body: JSON.stringify({ phone, action }),
    });
  },

  verifyOTP: async (phone: string, otp: string) => {
    return apiRequest("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  },

  register: async (userData: {
    phone: string;
    username: string;
    full_name: string;
    email: string;
    dob: string;
    gender: string;
    password: string;  // Changed from 'pin' to 'password'
    address: string;   // Added address field
    state: string;     // Added state field
  }) => {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  login: async (email_phone_username: string, password: string) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email_phone_username, password }),
    });
    return response;
  },

  loginWithOTP: async (phone: string, otp: string) => {
    return apiRequest("/auth/login/confirm-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  },

  logout: async (): Promise<{ message: string }> => {
    const token = authStateManager.getToken();

    console.log("🔍 Starting logout process");
    console.log("🔍 Token before logout:", token);
    console.log(
      "🔍 Token is valid:",
      token ? tokenManager.isValidToken(token) : false
    );

    if (!token) {
      console.log("⚠️ No token found, clearing auth state anyway");
      authStateManager.logout();
      throw new ApiRequestError("No authentication token found", 401);
    }

    try {
      console.log("📡 Sending logout request to server");
      const response = await apiRequest("/auth/logout", {
        method: "POST",
      });

      console.log("✅ Logout API call successful:", response);

      // Clear auth state AFTER successful API call
      authStateManager.logout();

      return response;
    } catch (error) {
      console.error("❌ Logout API call failed:", error);

      // Clear auth state even if API call fails
      // This ensures user is logged out on frontend regardless
      authStateManager.logout();

      // Re-throw the error so handleLogout can handle it
      throw error;
    }
  },
};
