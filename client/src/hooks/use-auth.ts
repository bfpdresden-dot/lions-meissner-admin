import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type AuthState = {
  authenticated: boolean;
  setupRequired?: boolean;
  user?: AuthUser;
};

export function useAuth() {
  return useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], { authenticated: false, setupRequired: false });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}
