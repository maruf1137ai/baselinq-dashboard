// hooks/useSignup.ts
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "@/lib/Api";

export const useSignup = () => {
  return useMutation({
    mutationFn: registerUser,
  });
};
