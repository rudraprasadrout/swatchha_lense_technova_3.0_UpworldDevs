// SwachhLens Global Application Configuration
const isLocalhost = (typeof window !== 'undefined') && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '');

const CONFIG = window.CONFIG = {
    // Dynamic API URL: Uses local Flask backend when on localhost, or deployed Render API URL when on Netlify/Cloud
    API_BASE_URL: (typeof window !== 'undefined' && window.SWACHH_API_URL) 
        ? window.SWACHH_API_URL 
        : (isLocalhost ? "http://127.0.0.1:5000" : "https://swachhlens-backend.onrender.com"),
    DEFAULT_LAT: 20.2961,
    DEFAULT_LNG: 85.8245
};