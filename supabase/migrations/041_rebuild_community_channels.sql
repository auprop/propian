-- ============================================================
-- 041 — Rebuild community channels with new structure
-- ============================================================
-- Replaces old categories (General, Trading, Challenges) with:
--   ANNOUNCEMENTS, GENERAL, TRADING, PROP FIRMS, LEARNING, COMMUNITY
-- Keeps the #general channel (uncategorized, top-level).
-- Locked channels: announcements, rules

DO $$
DECLARE
  v_community_id uuid;
  v_owner_id uuid;
  v_cat_announcements uuid;
  v_cat_general uuid;
  v_cat_trading uuid;
  v_cat_propfirms uuid;
  v_cat_learning uuid;
  v_cat_community uuid;
BEGIN
  -- Get the first community
  SELECT id, owner_id INTO v_community_id, v_owner_id
  FROM public.communities
  LIMIT 1;

  IF v_community_id IS NULL THEN
    RAISE NOTICE 'No community found, skipping';
    RETURN;
  END IF;

  -- ─── 1. Delete old channels (except #general) and their read state ───
  -- Delete read states for channels we're removing
  DELETE FROM public.channel_read_state
  WHERE channel_id IN (
    SELECT id FROM public.chat_rooms
    WHERE community_id = v_community_id
      AND name != 'general'
  );

  -- Delete messages in channels we're removing
  DELETE FROM public.message_reactions
  WHERE message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.chat_rooms cr ON cr.id = m.room_id
    WHERE cr.community_id = v_community_id
      AND cr.name != 'general'
  );

  DELETE FROM public.knowledge_pins
  WHERE channel_id IN (
    SELECT id FROM public.chat_rooms
    WHERE community_id = v_community_id
      AND name != 'general'
  );

  DELETE FROM public.messages
  WHERE room_id IN (
    SELECT id FROM public.chat_rooms
    WHERE community_id = v_community_id
      AND name != 'general'
  );

  -- Delete old channels (except #general)
  DELETE FROM public.chat_rooms
  WHERE community_id = v_community_id
    AND name != 'general';

  -- ─── 2. Delete old categories ───
  DELETE FROM public.community_categories
  WHERE community_id = v_community_id;

  -- ─── 3. Create new categories ───

  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Announcements', 0)
  RETURNING id INTO v_cat_announcements;

  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'General', 1)
  RETURNING id INTO v_cat_general;

  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Trading', 2)
  RETURNING id INTO v_cat_trading;

  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Prop Firms', 3)
  RETURNING id INTO v_cat_propfirms;

  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Learning', 4)
  RETURNING id INTO v_cat_learning;

  INSERT INTO public.community_categories (community_id, name, position)
  VALUES (v_community_id, 'Community', 5)
  RETURNING id INTO v_cat_community;

  -- ─── 4. Move #general to be uncategorized (top-level, no category) ───
  UPDATE public.chat_rooms
  SET category_id = NULL, position = 0, description = 'Main chat'
  WHERE community_id = v_community_id AND name = 'general';

  -- ─── 5. Create ANNOUNCEMENTS channels ───

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position, permissions_override)
  VALUES ('group', 'announcements', 'Propian platform updates, new features, community events', v_community_id, v_cat_announcements, v_owner_id, 0, '{"can_send_messages": false}'::jsonb);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position, permissions_override)
  VALUES ('group', 'rules', 'Community guidelines', v_community_id, v_cat_announcements, v_owner_id, 1, '{"can_send_messages": false}'::jsonb);

  -- ─── 6. Create GENERAL channels ───

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'introductions', 'New members introduce themselves', v_community_id, v_cat_general, v_owner_id, 0);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'off-topic', 'Non-trading chat', v_community_id, v_cat_general, v_owner_id, 1);

  -- ─── 7. Create TRADING channels ───

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'trade-ideas', 'Setups and analysis', v_community_id, v_cat_trading, v_owner_id, 0);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'trade-results', 'Post outcomes with screenshots', v_community_id, v_cat_trading, v_owner_id, 1);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'chart-analysis', 'Technical analysis discussion', v_community_id, v_cat_trading, v_owner_id, 2);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'market-news', 'Economic events, breaking news, session recaps', v_community_id, v_cat_trading, v_owner_id, 3);

  -- ─── 8. Create PROP FIRMS channels ───

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'firm-reviews', 'Discuss and compare prop firms', v_community_id, v_cat_propfirms, v_owner_id, 0);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'challenge-talk', 'Tips, strategies, experiences with evaluations', v_community_id, v_cat_propfirms, v_owner_id, 1);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'payout-discussion', 'Share payout experiences, timelines, issues', v_community_id, v_cat_propfirms, v_owner_id, 2);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'firm-alerts', 'Rule changes, new firms, shutdowns, scam warnings', v_community_id, v_cat_propfirms, v_owner_id, 3);

  -- ─── 9. Create LEARNING channels ───

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'trading-journal', 'Share entries, get feedback', v_community_id, v_cat_learning, v_owner_id, 0);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'risk-management', 'Position sizing, drawdown, psychology', v_community_id, v_cat_learning, v_owner_id, 1);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'beginner-questions', 'Safe space for newer traders', v_community_id, v_cat_learning, v_owner_id, 2);

  -- ─── 10. Create COMMUNITY channels ───

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'wins-and-milestones', 'Passed a challenge, got funded, first payout', v_community_id, v_cat_community, v_owner_id, 0);

  INSERT INTO public.chat_rooms (type, name, description, community_id, category_id, created_by, position)
  VALUES ('group', 'accountability', 'Daily goals, check-ins, trading partners', v_community_id, v_cat_community, v_owner_id, 1);

  RAISE NOTICE 'Rebuilt channels for community %', v_community_id;
END
$$;
