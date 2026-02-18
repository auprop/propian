-- Quote reposts: add quoted_post_id to posts and expand type check

-- Add quoted_post_id column (nullable FK to posts)
ALTER TABLE public.posts ADD COLUMN quoted_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Update type CHECK to include 'quote'
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type IN ('text', 'image', 'poll', 'quote'));

-- Index for joining quoted posts
CREATE INDEX idx_posts_quoted_post_id ON public.posts(quoted_post_id) WHERE quoted_post_id IS NOT NULL;

-- Trigger: when a quote repost is created/deleted, bump repost_count on the original post
CREATE OR REPLACE FUNCTION public.handle_quote_repost_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.quoted_post_id IS NOT NULL THEN
    UPDATE public.posts SET repost_count = repost_count + 1 WHERE id = NEW.quoted_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.quoted_post_id IS NOT NULL THEN
    UPDATE public.posts SET repost_count = greatest(0, repost_count - 1) WHERE id = OLD.quoted_post_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_quote_repost_change
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_quote_repost_change();
