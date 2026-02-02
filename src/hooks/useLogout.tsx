// Custom logout hook for Django authentication
import { useMutation } from "@tanstack/react-query";
import { logoutUser } from "@/lib/Api";

export const useLogout = () => {
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      // Clear all authentication data from localStorage
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");

      // Clear project-related data (user-specific)
      localStorage.removeItem("selectedProjectId");
      localStorage.removeItem("projectLocation");

      // Redirect to login page
      window.location.href = "/login";
    },
    onError: (error) => {
      console.error("Logout error:", error);
      // Even if API fails, clear local data and redirect
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedProjectId");
      localStorage.removeItem("projectLocation");
      window.location.href = "/login";
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return { logout, isLoading: logoutMutation.isPending };
};
