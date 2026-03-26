import { BASE_URL } from "./config";

/**
 * Common fetch wrapper for API integration
 * @param {string} endpoint - The relative endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} - The response JSON
 */
const apiClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // Get token from localStorage
  const token = localStorage.getItem("authToken");

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // DEBUG LOGGING: What we are sending
  console.log(`[API REQUEST] ${config.method || "GET"} ${url}`);
  if (config.body) {
    try {
      console.log("[API BODY]", JSON.parse(config.body));
    } catch {
      console.log("[API BODY]", config.body);
    }
  }

  try {
    const response = await fetch(url, config);
    console.log(`[API RESPONSE] ${response.status} ${url}`);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No user account is found.");
      }
      const errorData = await response.json().catch(() => ({}));
      console.log("[API ERROR RESPONSE]", errorData);
      const msg = errorData.message || errorData.error || errorData.errorMessage || `Error ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    console.log("[API DATA RECEIVED]", data);
    return data;
  } catch (error) {
    console.warn("API Error:", error);
    throw error;
  }
};

export default apiClient;
