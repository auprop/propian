import { formatDistanceToNow, format } from "date-fns";

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date, pattern = "MMM d, yyyy"): string {
  return format(new Date(date), pattern);
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "h:mm a");
}
