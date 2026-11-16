// hooks/useLogin.ts
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/lib/Api";
import { loginNext, saveSession } from "@/lib/twoStep";

export const useLogin = () => {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // When a two-step code is needed first there are no tokens yet: the
      // sign-in page finishes the session after the code.
      if (loginNext(data) === "signed_in") saveSession(data);
    },
  });
};
