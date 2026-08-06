/**
 * Swachh Lens - Central API Client Module
 * Provides Fetch API wrappers for all backend endpoints.
 */

const ApiClient = {
  /**
   * Healthcheck request to backend
   */
  async checkHealth() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  },

  /**
   * Submit citizen report to POST /api/v1/report
   * @param {FormData} formData 
   * @param {Function} onProgressCallback 
   */
  async submitReport(formData, onProgressCallback = null) {
    try {
      // Use XMLHttpRequest if upload progress callback is provided, else fetch API
      if (onProgressCallback) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${CONFIG.API_BASE_URL}/api/v1/report`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              onProgressCallback(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                resolve(res);
              } catch (e) {
                reject(new Error("Invalid JSON response from server"));
              }
            } else {
              try {
                const errRes = JSON.parse(xhr.responseText);
                reject(new Error(errRes.message || `Server error (${xhr.status})`));
              } catch (e) {
                reject(new Error(`Server error (${xhr.status})`));
              }
            }
          };

          xhr.onerror = () => reject(new Error("Network error during report submission"));
          xhr.send(formData);
        });
      }

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/v1/report`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || `Submission failed (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error("Report submission failed:", error);
      throw error;
    }
  },

  /**
   * Fetch all active civic reports from GET /api/v1/reports
   */
  async getReports() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/v1/reports`);
      const data = await response.json();
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Failed to load reports history");
      }
      return data.data || [];
    } catch (error) {
      console.error("Fetch reports failed:", error);
      throw error;
    }
  },

  /**
   * Fetch Base64 image payload for a specific ticket from GET /api/v1/report/<id>/image
   * @param {string} ticketId 
   */
  async getReportImage(ticketId) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/v1/report/${encodeURIComponent(ticketId)}/image`);
      const data = await response.json();
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Failed to retrieve ticket image");
      }
      return data.image_b64;
    } catch (error) {
      console.error(`Fetch image failed for ticket ${ticketId}:`, error);
      throw error;
    }
  }
};

window.ApiClient = ApiClient;
