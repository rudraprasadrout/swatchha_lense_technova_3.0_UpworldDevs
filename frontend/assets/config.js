const CONFIG = window.CONFIG = {
    // Set your deployed Render API URL here when live, e.g., "https://swachhlens-backend.onrender.com"
    API_BASE_URL: (typeof window !== 'undefined' && window.SWACHH_API_URL) ? window.SWACHH_API_URL : "http://127.0.0.1:5000",
    DEFAULT_LAT: 20.2961,
    DEFAULT_LNG: 85.8245
};