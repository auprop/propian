-- Fix: the quote repost trigger should only fire for type='quote' posts,
-- not type='repost' posts. Simple reposts already get their count from
-- the reposts table trigger (handle_repost_change).

CREATE OR REPLACE FUNCTION public.handle_quote_repost_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.quoted_post_id IS NOT NULL AND NEW.type = 'quote' THEN
    UPDATE public.posts SET repost_count = repost_count + 1 WHERE id = NEW.quoted_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.quoted_post_id IS NOT NULL AND OLD.type = 'quote' THEN
    UPDATE public.posts SET repost_count = greatest(0, repost_count - 1) WHERE id = OLD.quoted_post_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
