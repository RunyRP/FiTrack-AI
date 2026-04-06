import axios from 'axios';

// This will use the environment variable VITE_API_URL if it exists, 
// otherwise it falls back to localhost for development.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Automatically add the token to every request if it exists
api.interceptors.request.use((config) => {
  // Bypass ngrok browser warning for API calls
  config.headers['ngrok-skip-browser-warning'] = 'true';
  
  const token = localStorage.getItem('token');
  if (token) {
    console.log("DEBUG API: Adding token to request:", config.url);
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.log("DEBUG API: No token found in localStorage for request:", config.url);
  }
  return config;
});

export default api;
export { API_URL };
