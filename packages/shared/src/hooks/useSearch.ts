"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as searchApi from "../api/search";

export function useSearch(supabase: SupabaseClient) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "traders" | "firms" | "posts" | "reviews">("all");

  // Debounce the query
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useQuery({
    queryKey: ["search", debouncedQuery, filter],
    queryFn: () => searchApi.searchAll(supabase, debouncedQuery, filter),
    enabled: debouncedQuery.length >= 2,
  });

  return { query, setQuery, filter, setFilter, results };
}
