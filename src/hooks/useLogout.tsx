// Custom logout hook for Django authentication
import { useMutation } from "@tanstack/react-query";
import { logoutUser } from "@/lib/Api";

/**
 * Everything in localStorage that belongs to the signed-in user. Clearing it
 * all on logout stops the next person on the same browser inheriting it.
 *
 * `userRole` is here because it was once missed: the role is saved when a
 * project is picked, so a user who signs in without picking one (a Baselinq
 * superuser going straight to the Admin panel) was labelled with the previous
 * user's project role — "Employer" on a superadmin.
 */
const USER_KEYS = ["access", "refresh", "user", "userRole", "selectedProjectId", "projectLocation"];

export const clearUserSession = () => {
  USER_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const useLogout = () => {
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      clearUserSession();
      window.location.href = "/login";
    },
    onError: (error) => {
      console.error("Logout error:", error);
      // Even if the API call fails, clear local data and redirect
      clearUserSession();
      window.location.href = "/login";
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return { logout, isLoading: logoutMutation.isPending };
};
