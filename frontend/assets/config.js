// SwachhLens Global Application Configuration
const isLocalOrigin = typeof window !== 'undefined' && window.location.origin && 
    (window.location.origin.includes('127.0.0.1') || window.location.origin.includes('localhost'));

const PRODUCTION_BACKEND_URL = "https://swachhlens-backend-upworlddev.onrender.com";
const defaultBackendUrl = isLocalOrigin ? window.location.origin : PRODUCTION_BACKEND_URL;

const CONFIG = window.CONFIG = {
    API_BASE_URL: (typeof window !== 'undefined' && window.SWACHH_API_URL) 
        ? window.SWACHH_API_URL 
        : defaultBackendUrl,
    DEFAULT_LAT: 20.2961,
    DEFAULT_LNG: 85.8245
};