-- ============================================================
-- 042 — Move #general into the General category
-- ============================================================

DO $$
DECLARE
  v_community_id uuid;
  v_cat_general uuid;
BEGIN
  SELECT id INTO v_community_id FROM public.communities LIMIT 1;
  IF v_community_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_cat_general
  FROM public.community_categories
  WHERE community_id = v_community_id AND lower(name) = 'general';

  UPDATE public.chat_rooms
  SET category_id = v_cat_general, position = 0
  WHERE community_id = v_community_id AND name = 'general';

  -- Bump other General channels down
  UPDATE public.chat_rooms
  SET position = position + 1
  WHERE community_id = v_community_id
    AND category_id = v_cat_general
    AND name != 'general';
END
$$;
