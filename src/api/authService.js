import apiClient from "./apiClient";
import { ENDPOINTS } from "./config";

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Get Authentication Token using dynamic credentials from the login form
   * @param {string} username - User login name
   * @param {string} password - User password
   */
  getToken: async (username, password) => {
    try {
      const body = {
        "client_id": username, // Dynamically use what the user types
        "client_secret": password, // Dynamically use the password
        "grant_type": "string" // Keeping this as provided, although usually "password"
      };
      
      return await apiClient(ENDPOINTS.TOKEN, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.warn("Token API connection failed:", error);
      throw error;
    }
  },
  
  /**
   * Get Stores by UserId (Token)
   */
  getStores: async () => {
    try {
      return await apiClient(ENDPOINTS.GET_STORES, {
        method: "GET",
      });
    } catch (error) {
      console.warn("GetStores API connection failed:", error);
      throw error;
    }
  },

  /**
   * Get Cost Centers by Store Code
   * @param {string} strCd - The store code from the selected store
   * @param {number} ccTyp - The cost center type (default: 34)
   */
  getCostCenters: async (strCd, ccTyp = 34) => {
    try {
      const endpoint = `${ENDPOINTS.GET_COST_CENTERS}?CCtyp=${ccTyp}&Strcd=${strCd}`;
      return await apiClient(endpoint, {
        method: "GET",
      });
    } catch (error) {
      console.warn("GetCostCenters API connection failed:", error);
      throw error;
    }
  },

  /**
   * Get IN Patient Details
   */
  getInPatients: async () => {
    try {
      const response = await apiClient(ENDPOINTS.GET_IN_PATIENTS, { method: "GET" });
      console.log("IN Patient API Response:", response);
      return response;
    } catch (error) {
      console.warn("GetInPatients API connection failed:", error);
      throw error;
    }
  },

  /**
   * Get OUT Patient Details
   * @param {string} ptnNo - Optional Patient Number
   */
  getOutPatients: async (ptnNo = "") => {
    try {
      const endpoint = ptnNo ? `${ENDPOINTS.GET_OUT_PATIENTS}?PtnNo=${ptnNo}` : ENDPOINTS.GET_OUT_PATIENTS;
      const response = await apiClient(endpoint, { method: "GET" });
      console.log("OUT Patient API Response:", response);
      return response;
    } catch (error) {
      console.warn("GetOutPatients API connection failed:", error);
      throw error;
    }
  },

  /**
   * Search Medicines/Items Master Details
   */
  getSearchItems: async (strCd, itemDesc, ccCd, ccTyp = 34, withinStk = true) => {
    try {
      console.log("Searching Items with params:", { strCd, itemDesc, ccCd, ccTyp, withinStk });
      const endpoint = `${ENDPOINTS.GET_ITEMS}?Strcd=${strCd}&ItemDesc=${itemDesc}&CCtyp=${ccTyp}&CCCd=${ccCd}&WithinStk=${withinStk}`;
      const response = await apiClient(endpoint, { method: "GET" });
      console.log("Items API Response:", response);
      return response;
    } catch (error) {
      console.warn("GetItems API connection failed:", error);
      throw error;
    }
  },

  /**
   * Get Batch Details for a specific Medicine Item
   * @param {string} strCd - Store Code
   * @param {string} itemCd - Item Code (e.g. MED001130)
   */
  getItemBatchList: async (strCd, itemCd) => {
    try {
      console.log("Fetching batch details for:", { strCd, itemCd });
      const endpoint = `${ENDPOINTS.GET_ITEM_BATCH}?Strcd=${strCd}&ItemCd=${itemCd}`;
      const response = await apiClient(endpoint, { method: "GET" });
      console.log("Item Batch API Response:", response);
      return response;
    } catch (error) {
      console.warn("GetItemBatchList API connection failed:", error);
      throw error;
    }
  },

  /**
   * Add Issue Hold Vch
   */
  addIssueHoldVch: async (payload) => {
    try {
      const response = await apiClient(ENDPOINTS.ADD_ISSUE_HOLD_VCH, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      console.log("AddIssueHoldVch API Response:", response);
      return response;
    } catch (error) {
      console.warn("AddIssueHoldVch API connection failed:", error);
      throw error;
    }
  },

  /**
   * Get Item/Patient details by Barcode/QR
   */
  getItemByBarcode: async (barCd) => {
    try {
      console.log("Fetching details by barcode:", barCd);
      const endpoint = `${ENDPOINTS.GET_ITEM_BY_BARCODE}?BarCd=${barCd}`;
      const response = await apiClient(endpoint, { method: "GET" });
      console.log("Barcode API Response:", response);
      return response;
    } catch (error) {
      console.warn("GetItemByBarcode API connection failed:", error);
      throw error;
    }
  },
};
