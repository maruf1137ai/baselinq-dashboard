import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ Helper to get token
const getToken = () => {
  return localStorage.getItem("access_token"); // or use cookies if needed
};

// ✅ Axios instance
const api = axios.create({
  baseURL: BASE_URL,
});

// ✅ Add token to headers for every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// ✅ Main hook
export const useFetchData = (endpoint, queryKey = [], options = {}) => {
  const fetchData = async () => {
    const response = await api.get(endpoint);
    return response.data;
  };

  return useQuery({
    queryKey: [endpoint, ...queryKey],
    queryFn: fetchData,
    staleTime: 1000 * 60, // 1 minute cache
    retry: 1,
    ...options,
  });
};
