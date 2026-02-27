-- ────────────────────────────────────────────────────────────────────
--  Single-query feed RPC
--  Replaces 4-5 sequential queries (posts, quoted, likes, bookmarks,
--  reposts) with one database round-trip.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_feed(
  p_mode   text         DEFAULT 'for-you',   -- 'for-you' | 'following'
  p_cursor timestamptz  DEFAULT NULL,
  p_limit  int          DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',              fp.id,
          'user_id',         fp.user_id,
          'content',         fp.content,
          'type',            fp.type,
          'sentiment_tag',   fp.sentiment_tag,
          'media_urls',      fp.media_urls,
          'quoted_post_id',  fp.quoted_post_id,
          'like_count',      fp.like_count,
          'comment_count',   fp.comment_count,
          'repost_count',    fp.repost_count,
          'share_count',     fp.share_count,
          'created_at',      fp.created_at,
          'updated_at',      fp.updated_at,
          -- author
          'author', (
            SELECT jsonb_build_object(
              'id',                      a.id,
              'username',                a.username,
              'display_name',            a.display_name,
              'avatar_url',              a.avatar_url,
              'is_verified',             a.is_verified,
              'pro_subscription_status', a.pro_subscription_status
            )
            FROM profiles a WHERE a.id = fp.user_id
          ),
          -- quoted post (+ its author)
          'quoted_post', CASE WHEN fp.quoted_post_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
              'id',            qp.id,
              'user_id',       qp.user_id,
              'content',       qp.content,
              'type',          qp.type,
              'sentiment_tag', qp.sentiment_tag,
              'media_urls',    qp.media_urls,
              'like_count',    qp.like_count,
              'comment_count', qp.comment_count,
              'repost_count',  qp.repost_count,
              'created_at',    qp.created_at,
              'author', (
                SELECT jsonb_build_object(
                  'id',                      qa.id,
                  'username',                qa.username,
                  'display_name',            qa.display_name,
                  'avatar_url',              qa.avatar_url,
                  'is_verified',             qa.is_verified,
                  'pro_subscription_status', qa.pro_subscription_status
                )
                FROM profiles qa WHERE qa.id = qp.user_id
              )
            )
            FROM posts qp WHERE qp.id = fp.quoted_post_id
          ) ELSE NULL END,
          -- current-user interaction flags
          'is_liked', EXISTS(
            SELECT 1 FROM likes l
            WHERE l.target_id = fp.id
              AND l.user_id   = v_uid
              AND l.target_type = 'post'
          ),
          'is_bookmarked', EXISTS(
            SELECT 1 FROM bookmarks b
            WHERE b.post_id = fp.id
              AND b.user_id = v_uid
          ),
          'is_reposted', EXISTS(
            SELECT 1 FROM reposts r
            WHERE r.post_id = fp.id
              AND r.user_id = v_uid
          )
        )
        ORDER BY fp.created_at DESC
      )
      FROM (
        SELECT p.*
        FROM   posts p
        WHERE  (p_cursor IS NULL OR p.created_at < p_cursor)
          AND  (
            p_mode <> 'following'
            OR p.user_id IN (
              SELECT f.following_id FROM follows f WHERE f.follower_id = v_uid
            )
          )
        ORDER BY p.created_at DESC
        LIMIT  p_limit + 1
      ) fp
    ),
    '[]'::jsonb
  );
END;
$$;

-- Realtime already enabled on posts table (supabase_realtime publication)
