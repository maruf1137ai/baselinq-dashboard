import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const BASE_URL = "http://localhost:8000/";

export const usePostAuth = (endpoint, onSuccess, onError) => {
  return useMutation({
    mutationFn: async (payload) => {
      const response = await axios.post(`${BASE_URL}${endpoint}`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess,
    onError,
  });
};
