// Custom hook for Django authentication
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  name: string;
  organization: string | null;
  role: string | null;
  profile: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: Infinity, // User data doesn't change unless they re-login
  });
};
