import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as calendarApi from "../api/calendar";

/**
 * Fetch economic events for a specific date
 */
export function useEconomicEvents(supabase: SupabaseClient, date: string | null) {
  return useQuery({
    queryKey: ["economic-events", date],
    queryFn: () => calendarApi.getEconomicEvents(supabase, date!),
    enabled: date != null,
  });
}

/**
 * Fetch economic events for a date range
 */
export function useEconomicEventsRange(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string
) {
  return useQuery({
    queryKey: ["economic-events-range", dateFrom, dateTo],
    queryFn: () => calendarApi.getEconomicEventsRange(supabase, dateFrom, dateTo),
  });
}

/**
 * Fetch the 7-day week strip for a given date
 */
export function useWeekDays(supabase: SupabaseClient, date: string) {
  return useQuery({
    queryKey: ["week-days", date],
    queryFn: () => calendarApi.getWeekDays(supabase, date),
  });
}

/**
 * Fetch monthly event impacts for the calendar grid view
 */
export function useMonthlyEvents(
  supabase: SupabaseClient,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: ["monthly-events", year, month],
    queryFn: async () => {
      const map = await calendarApi.getMonthlyEventSummary(supabase, year, month);
      // Convert Map to a serializable object for React Query
      const result: Record<string, string[]> = {};
      map.forEach((v, k) => {
        result[k] = v;
      });
      return result;
    },
  });
}

/**
 * Fetch user event alerts
 */
export function useEventAlerts(supabase: SupabaseClient) {
  return useQuery({
    queryKey: ["event-alerts"],
    queryFn: () => calendarApi.getEventAlerts(supabase),
  });
}

/**
 * Toggle an event alert on/off
 */
export function useToggleEventAlert(supabase: SupabaseClient) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      eventName: string;
      country: string;
      currency: string;
      impact: string;
    }) => calendarApi.toggleEventAlert(supabase, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-alerts"] });
    },
  });
}
