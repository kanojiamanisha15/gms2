import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/constants/api";

// Get API URL from environment or use default (origin only, e.g. http://localhost:3000)
const apiURL = process.env.NEXT_PUBLIC_APP_URL || API_BASE_URL || "http://localhost:3000";

// Create Axios instance
const api = axios.create({
  baseURL: `${apiURL}`,
  timeout: 600000, // 10 minutes timeout (for large file uploads)
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Automatically send cookies (auth_token)
  // sends cookies on cross-origin requests (important for cookie-based auth).
});

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status, config } = error.response;
      
      // Handle 401 Unauthorized
      if (status === 401) {
        console.error("Unauthorized, redirecting to login...");
        
        // Don't redirect if already on login page or if it's a login request
        if (!config.url?.includes("/login") && typeof window !== "undefined") {
          toast.error("Your session has expired. Please login again.");
          
          // Redirect to login page
          window.location.href = "/login";
        }
      }
      
      // Handle other common errors
      if (status >= 500) {
        toast.error("Server error. Please try again later.");
      }
    } else if (error.request) {
      // Request was made but no response received
      toast.error("Network error. Please check your connection.");
    }
    
    return Promise.reject(error);
  }
);

/**
 * Generic POST request
 */
export const postRequest = async <T, D = unknown>(
  endpoint: string,
  data: D
): Promise<T> => {
  try {
    const response = await api.post<T>(endpoint, data);
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to post data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to post data"
      );
    } else {
      throw new Error("Failed to post data");
    }
  }
};

/**
 * Generic PUT request
 */
export const putRequest = async <T, D = unknown>(
  endpoint: string,
  data: D
): Promise<T> => {
  try {
    const response = await api.put<T>(endpoint, data);
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to update data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to update data"
      );
    } else {
      throw new Error("Failed to update data");
    }
  }
};

/**
 * Generic PATCH request
 */
export const patchRequest = async <T, D = unknown>(
  endpoint: string,
  data: D
): Promise<T> => {
  try {
    const response = await api.patch<T>(endpoint, data);
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to update data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to update data"
      );
    } else {
      throw new Error("Failed to update data");
    }
  }
};

/**
 * Generic DELETE request
 */
export const deleteRequest = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await api.delete<T>(endpoint);
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to delete data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to delete data"
      );
    } else {
      throw new Error("Failed to delete data");
    }
  }
};

/**
 * Generic GET request
 */
export const getRequest = async <T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { signal?: AbortSignal }
): Promise<T> => {
  try {
    // Filter out undefined values from params
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([_, value]) => value !== undefined)
        )
      : undefined;

    const response = await api.get<T>(endpoint, {
      params: cleanParams,
      signal: options?.signal,
    });
    return response.data;
  } catch (error) {
    // Re-throw abort/cancel errors so callers can detect and ignore them
    if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") {
      throw error;
    }
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to get data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to get data"
      );
    } else {
      throw new Error("Failed to get data");
    }
  }
};

/**
 * POST request with FormData (for file uploads)
 */
export const postFormDataRequest = async <T>(
  endpoint: string,
  formData: FormData
): Promise<T> => {
  try {
    const response = await api.post<T>(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to post form data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to post form data"
      );
    } else {
      throw new Error("Failed to post form data");
    }
  }
};

/**
 * PUT request with FormData (for file uploads)
 */
export const putFormDataRequest = async <T>(
  endpoint: string,
  formData: FormData
): Promise<T> => {
  try {
    const response = await api.put<T>(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { message: string }).message || "Failed to update form data"
      );
    } else if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.data &&
      typeof error.response.data === "object" &&
      "error" in error.response.data
    ) {
      throw new Error(
        (error.response.data as { error: string }).error || "Failed to update form data"
      );
    } else {
      throw new Error("Failed to update form data");
    }
  }
};

// Export the axios instance for advanced use cases
export default api;
