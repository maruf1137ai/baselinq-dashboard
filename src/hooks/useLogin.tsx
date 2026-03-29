// hooks/useLogin.ts
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/lib/Api";

export const useLogin = () => {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      console.log(data);
      // Save tokens and user data
      localStorage.setItem("access", data.tokens.access);
      localStorage.setItem("refresh", data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
    },
  });
};
