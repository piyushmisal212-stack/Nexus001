import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

// Allow attaching bearer token (used as fallback for cookie restrictions)
let _token = null;
export const setAuthToken = (t) => {
  _token = t;
  if (t) localStorage.setItem("nx_token", t);
  else localStorage.removeItem("nx_token");
};
export const getAuthToken = () => _token || localStorage.getItem("nx_token");

api.interceptors.request.use((cfg) => {
  const t = getAuthToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default api;
