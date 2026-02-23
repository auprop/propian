-- ============================================================
-- 043 — Add threading support to messages
-- ============================================================
-- Adds parent_message_id for reply threading,
-- plus denormalized reply_count and last_reply_at for display.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reply_at timestamptz;

-- Index for fast thread lookups
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_message_id)
  WHERE parent_message_id IS NOT NULL;

-- Trigger: auto-update reply_count and last_reply_at on parent
CREATE OR REPLACE FUNCTION public.update_thread_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at
    WHERE id = NEW.parent_message_id;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = GREATEST(0, reply_count - 1),
        last_reply_at = (
          SELECT MAX(created_at) FROM public.messages
          WHERE parent_message_id = OLD.parent_message_id AND id != OLD.id
        )
    WHERE id = OLD.parent_message_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_thread_counts ON public.messages;
CREATE TRIGGER trg_update_thread_counts
  AFTER INSERT OR DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_counts();
