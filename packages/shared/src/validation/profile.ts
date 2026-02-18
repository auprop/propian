import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(300).optional(),
  trading_style: z.enum(["scalper", "day-trader", "swing", "position"]).nullable().optional(),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
