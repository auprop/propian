-- ============================================================
-- 037 — Add description column + seed community channels
-- ============================================================
-- The design shows categories: GENERAL, TRADING, CHALLENGES
-- with multiple channels in each. Currently only one "General"
-- category with one "general" channel exists.

-- Add description column first (was missing from 026)
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS description text;

-- Add unique constraint on community_categories for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS uq_community_categories_name
  ON public.community_categories (community_id, lower(name));

DO $$
DECLARE
  v_community_id uuid;
  v_general_cat_id uuid;
  v_trading_cat_id uuid;
  v_challenges_cat_id uuid;
  v_owner_id uuid;
BEGIN
  -- Get the first community
  SELECT id, owner_id INTO v_community_id, v_owner_id
  FROM public.communities
  LIMIT 1;

  IF v_community_id IS NULL THEN
    RAISE NOTICE 'No community found, skipping seed';
    RETURN;
  END IF;

  -- Get or create GENERAL category
  SELECT id INTO v_general_cat_id
  FROM public.community_categories
  WHERE community_id = v_community_id AND lower(name) = 'general';

  IF v_general_cat_id IS NULL THEN
    INSERT INTO public.community_categories (community_id, name, position)
    VALUES (v_community_id, 'General', 0)
    RETURNING id INTO v_general_cat_id;
  END IF;

  -- Create TRADING category
  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Trading', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_trading_cat_id;

  IF v_trading_cat_id IS NULL THEN
    SELECT id INTO v_trading_cat_id
    FROM public.community_categories
    WHERE community_id = v_community_id AND lower(name) = 'trading';
  END IF;

  -- Create CHALLENGES category
  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Challenges', 2)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_challenges_cat_id;

  IF v_challenges_cat_id IS NULL THEN
    SELECT id INTO v_challenges_cat_id
    FROM public.community_categories
    WHERE community_id = v_community_id AND lower(name) = 'challenges';
  END IF;

  -- Update existing general channel with description and position
  UPDATE public.chat_rooms
  SET description = 'General discussion', position = 0
  WHERE community_id = v_community_id AND name = 'general' AND category_id = v_general_cat_id;

  -- ── GENERAL category channels ──

  -- introductions
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  SELECT 'group', 'introductions', 'Say hello!', v_community_id, v_general_cat_id, v_owner_id, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'introductions'
  );

  -- announcements (locked)
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position, permissions_override)
  SELECT 'group', 'announcements', 'Official updates', v_community_id, v_general_cat_id, v_owner_id, 2,
    '{"can_send_messages": false}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'announcements'
  );

  -- ── TRADING category channels ──

  -- trade-ideas
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  SELECT 'group', 'trade-ideas', 'Share setups', v_community_id, v_trading_cat_id, v_owner_id, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'trade-ideas'
  );

  -- trade-results
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  SELECT 'group', 'trade-results', 'Post outcomes', v_community_id, v_trading_cat_id, v_owner_id, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'trade-results'
  );

  -- chart-analysis
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  SELECT 'group', 'chart-analysis', 'TA discussion', v_community_id, v_trading_cat_id, v_owner_id, 2
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'chart-analysis'
  );

  -- journal-share
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  SELECT 'group', 'journal-share', 'Share journals', v_community_id, v_trading_cat_id, v_owner_id, 3
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'journal-share'
  );

  -- ── CHALLENGES category channels ──

  -- challenge-talk
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  SELECT 'group', 'challenge-talk', 'Prop firm challenges', v_community_id, v_challenges_cat_id, v_owner_id, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'challenge-talk'
  );

  -- funded-traders (locked)
  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position, permissions_override)
  SELECT 'group', 'funded-traders', 'Funded only', v_community_id, v_challenges_cat_id, v_owner_id, 1,
    '{"can_send_messages": false}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms WHERE community_id = v_community_id AND name = 'funded-traders'
  );

  RAISE NOTICE 'Seeded channels for community %', v_community_id;
END
$$;
