-- Add 'repost' to the post type check constraint
-- A simple repost is a post with type='repost', quoted_post_id pointing to the original,
-- and empty content. It appears in the feed as a "reposted by" entry.

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type IN ('text', 'image', 'poll', 'quote', 'repost'));

-- Allow empty content for reposts (the content column already allows empty string,
-- but we need to update the CHECK if there was a min-length constraint)
-- Actually, content has no length constraint in the DB, so we're good.
