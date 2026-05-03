// utils/auth.ts
import { useState, useEffect } from "react";

export interface User {
  id: string;
  username?: string;
  email?: string;
  phone?: string;
  full_name?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Token management
export const tokenManager = {
  setToken: (token: string): void => {
    console.log("💾 Storing authentication token");
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  },

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  },

  removeToken(): void {
    console.log("🗑️ tokenManager.removeToken() called");

    if (typeof window !== "undefined") {
      const existingToken = localStorage.getItem("access_token");
      console.log(
        "🔍 Existing token in localStorage:",
        existingToken ? "exists" : "not found"
      );

      localStorage.removeItem("access_token");

      // Verify removal
      const afterRemoval = localStorage.getItem("access_token");
      console.log(
        "🔍 Token after removal:",
        afterRemoval ? "still exists!" : "successfully removed"
      );

      // Also clear any other auth-related data
      localStorage.removeItem("user_data");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user_data");

      console.log("✅ All auth data cleared from storage");
    }
  },

  isValidToken: (token: string): boolean => {
    if (!token) return false;

    try {
      // Basic JWT validation with expiration check
      const parts = token.split(".");
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      return payload.exp > now;
    } catch (error) {
      console.error("❌ Token validation error:", error);
      return false;
    }
  },
};

// Auth state management with event emission
export const authStateManager = {
  // Emit auth state change event
  emitAuthChange(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authStateChange"));
    }
  },

  getToken(): string | null {
    return tokenManager.getToken();
  },

  setToken(token: string): void {
    tokenManager.setToken(token);
    this.emitAuthChange();
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return tokenManager.isValidToken(token);
  },

  getAuthState(): AuthState {
    if (typeof window === "undefined") {
      return { isAuthenticated: false, user: null, token: null };
    }

    const token = this.getToken();
    const isAuthenticated = token ? tokenManager.isValidToken(token) : false;

    let user: User | null = null;
    if (isAuthenticated && token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        user = {
          id: payload.sub || payload.user_id,
          username: payload.username,
          email: payload.email,
          phone: payload.phone,
          full_name: payload.full_name,
        };
      } catch (error) {
        console.error("❌ Error parsing user from token:", error);
      }
    }

    return { isAuthenticated, user, token };
  },

  login(token: string): void {
    console.log("🔐 User logging in");
    this.setToken(token);

    // Redirect to dashboard or home page after login
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },

  logout(): void {
    console.log("🔓 authStateManager.logout() called");
    console.log("🔍 Token before removal:", this.getToken());

    this.removeToken();

    console.log("🔍 Token after removal:", this.getToken());
    console.log("🔍 Is authenticated after logout:", this.isAuthenticated());

    // Don't redirect here - let the calling function handle it
    // This gives more control to the UI components
  },

  removeToken(): void {
    console.log("🗑️ Removing authentication token from localStorage");
    tokenManager.removeToken();
    this.emitAuthChange();

    // Verify token was actually removed
    const remainingToken = tokenManager.getToken();
    if (remainingToken) {
      console.error("❌ Token was not properly removed!", remainingToken);
    } else {
      console.log("✅ Token successfully removed from localStorage");
    }
  },
};

// Hook for authentication with event listener
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });

  useEffect(() => {
    // Set initial auth state
    const state = authStateManager.getAuthState();
    setAuthState(state);

    // Listen for auth state changes
    const handleAuthStateChange = () => {
      const newState = authStateManager.getAuthState();
      setAuthState(newState);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("authStateChange", handleAuthStateChange);

      // Cleanup event listener
      return () => {
        window.removeEventListener("authStateChange", handleAuthStateChange);
      };
    }
  }, []);

  return {
    ...authState,
    login: (token: string) => {
      authStateManager.login(token);
    },
    logout: () => {
      authStateManager.logout();
    },
  };
};

// Utility function to add auth header to requests
export const getAuthHeaders = (): HeadersInit => {
  const token = tokenManager.getToken();
  if (token && tokenManager.isValidToken(token)) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
};
