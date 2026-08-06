/**
 * Swachh Lens - Utility Helpers
 */

const Utils = {
  /**
   * Format ISO date string into user friendly readable format
   */
  formatDate(isoString) {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (e) {
      return isoString;
    }
  },

  /**
   * Map urgency score (1.0 - 10.0) to color hex code
   */
  getScoreColor(score) {
    const s = Number(score) || 1.0;
    if (s >= 7.5) return "#ef4444"; // Urgent Red
    if (s >= 5.0) return "#f59e0b"; // Warning Amber
    if (s >= 3.0) return "#2563eb"; // Moderate Blue
    return "#10b981";              // Low/Clean Green
  },

  /**
   * Map urgency score to text label
   */
  getScoreCategoryLabel(score) {
    const s = Number(score) || 1.0;
    if (s >= 8.5) return "Critical Hazard";
    if (s >= 7.0) return "High Priority";
    if (s >= 5.0) return "Moderate Priority";
    if (s >= 3.0) return "Minor Litter";
    return "Clean / Low Risk";
  },

  /**
   * Sanitize text content to prevent XSS
   */
  escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Convert file object to data URL string
   */
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Format bytes into human readable size string
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
};

window.Utils = Utils;
