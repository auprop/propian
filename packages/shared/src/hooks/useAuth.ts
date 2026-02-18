"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import * as authApi from "../api/auth";

export function useSession(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authApi.getSession(supabase),
    staleTime: 5 * 60_000, // 5 min — session rarely changes mid-use
    gcTime: 30 * 60_000, // 30 min — keep in memory for the session lifetime
  });
}

export function useSignIn(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.signIn(supabase, email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useSignUp(supabase: SupabaseClient) {
  return useMutation({
    mutationFn: (data: { email: string; password: string; first_name: string; last_name: string; username: string }) =>
      authApi.signUp(supabase, data),
  });
}

export function useSignOut(supabase: SupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.signOut(supabase),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useResetPassword(supabase: SupabaseClient) {
  return useMutation({
    mutationFn: (email: string) => authApi.resetPassword(supabase, email),
  });
}
