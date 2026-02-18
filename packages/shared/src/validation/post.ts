import { z } from "zod";

export const createPostSchema = z.object({
  content: z
    .string()
    .max(2000, "Post must be under 2000 characters")
    .default(""),
  type: z.enum(["text", "image", "poll", "quote", "repost"]).default("text"),
  sentiment_tag: z.enum(["bullish", "bearish", "neutral"]).nullable().default(null),
  media_urls: z.array(z.string().url()).default([]),
  quoted_post_id: z.string().uuid().nullable().optional(),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be under 1000 characters"),
  parent_id: z.string().uuid().nullable().default(null),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
