import { BASE_URL } from "./config";

/**
 * Common fetch wrapper for API integration
 * @param {string} endpoint - The relative endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} - The response JSON
 */
const apiClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // Get token from sessionStorage
  const token = sessionStorage.getItem("authToken");

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
    console.log(`[API STATUS CHECK] Status: ${response.status} for ${url}`);
    
    if (!response.ok) {
      // Even on error, we want to see the JSON body if it exists
      const errorData = await response.json().catch(() => null);
      console.log("[API ERROR BODY RECEIVED]:", errorData);
      
      // We prioritize the message provided BY THE SERVER over any hardcoded text
      // We check for 'message', 'error', and 'errorMessage' fields
      const msg = errorData?.message || errorData?.error || errorData?.errorMessage 
                 || (response.status === 401 ? "Unauthorized: Check credentials" : `Error ${response.status}`);
      
      console.log("[API THROWING ERROR]:", msg);
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
