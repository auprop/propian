-- ============================================================
-- 022: Comment interactions — bookmarks, reply_count, threading
-- ============================================================

-- 1. Comment bookmarks table
CREATE TABLE IF NOT EXISTS public.comment_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX idx_comment_bookmarks_user ON public.comment_bookmarks(user_id);
CREATE INDEX idx_comment_bookmarks_comment ON public.comment_bookmarks(comment_id);

ALTER TABLE public.comment_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comment bookmarks are viewable by everyone"
  ON public.comment_bookmarks FOR SELECT USING (true);
CREATE POLICY "Users can bookmark comments"
  ON public.comment_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unbookmark comments"
  ON public.comment_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- 2. Add reply_count to comments
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;

-- 3. Trigger to maintain reply_count on parent comments
CREATE OR REPLACE FUNCTION public.handle_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.comments SET reply_count = greatest(0, reply_count - 1) WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_reply_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_reply_count();

-- 4. Add parent_id index for faster threading queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
