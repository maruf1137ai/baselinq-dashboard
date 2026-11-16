// hooks/useLogin.ts
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/lib/Api";
import { storeTokens } from "@/lib/authSession";

export const useLogin = () => {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // console.log(data);
      // Save tokens and user data
      storeTokens(data.tokens);
      localStorage.setItem("user", JSON.stringify(data.user));
    },
  });
};
