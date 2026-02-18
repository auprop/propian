import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be under 100 characters"),
  body: z
    .string()
    .min(50, "Review must be at least 50 characters")
    .max(2000, "Review must be under 2000 characters"),
  pros: z.array(z.string().min(1).max(200)).min(1, "Add at least one pro").max(10),
  cons: z.array(z.string().min(1).max(200)).min(1, "Add at least one con").max(10),
  tags: z.array(z.string()).default([]),
  is_anonymous: z.boolean().default(false),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
