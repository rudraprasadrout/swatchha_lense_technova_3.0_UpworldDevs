// SwachhLens Global Application Configuration
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const originUrl = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !isFileProtocol)
    ? window.location.origin
    : "http://127.0.0.1:5000";

const CONFIG = window.CONFIG = {
    API_BASE_URL: (typeof window !== 'undefined' && window.SWACHH_API_URL) 
        ? window.SWACHH_API_URL 
        : originUrl,
    DEFAULT_LAT: 20.2961,
    DEFAULT_LNG: 85.8245
};