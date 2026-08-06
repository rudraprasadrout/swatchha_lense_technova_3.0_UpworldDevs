/**
 * Swachh Lens - Central Configuration
 * Never hardcode API URLs anywhere else in the application.
 */

const CONFIG = {
  // Backend Base API URL
  API_BASE_URL: "http://localhost:5000",
  
  // Default Map Coordinates (Bhubaneswar Civic Center fallback)
  DEFAULT_LAT: 20.2961,
  DEFAULT_LNG: 85.8245,
  
  // Supported Languages for Voice Note Transcripts
  SUPPORTED_LANGUAGES: [
    { code: "or-IN", name: "Odia (or-IN)" },
    { code: "hi-IN", name: "Hindi (hi-IN)" },
    { code: "en-US", name: "English (en-US)" },
    { code: "bn-IN", name: "Bengali (bn-IN)" },
    { code: "te-IN", name: "Telugu (te-IN)" }
  ],
  
  // Maximum Upload File Size (10 MB)
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  
  // Allowed Image Extensions
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"]
};

// Export to global scope
window.CONFIG = CONFIG;
