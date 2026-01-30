import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const BASE_URL = "http://localhost:8000/api/v1/";

const getToken = () => localStorage.getItem("token");

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const useApiMutation = (endpoint, method = "post", options = {}) => {
  const queryClient = useQueryClient();

  const mutationFn = async (payload) => {
    const response = await api.request({
      url: endpoint,
      method,
      data: payload,
    });
    return response.data;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries(); // refetch related data
    },
    ...options,
  });
};
