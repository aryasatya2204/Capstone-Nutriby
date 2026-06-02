// Default to production URL if env is missing
const BASE_URL = import.meta.env.VITE_API_URL;

// Add the /api prefix
export const API_BASE_URL = `${BASE_URL}/api`;

// Custom fetch wrapper to automatically prepend the base URL
export const apiFetch = async (endpoint, options = {}) => {
  // Ensure endpoint starts with a slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(`${API_BASE_URL}${path}`, options);
};

// Helper for generating static/image URLs with /api prefix
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default API_BASE_URL;
