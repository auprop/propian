-- ============================================================
-- 054: Notification Triggers
-- ============================================================
-- Wire up real-time notifications for: follow, like, comment,
-- reply, repost, and @mentions. Each trigger skips self-actions
-- and blocked users.
-- ============================================================

-- ─── 1. Schema update: add repost, remove review ─────────────

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('mention', 'like', 'follow', 'comment', 'repost', 'system'));

-- ─── 2. Helper: build actor data jsonb ───────────────────────

create or replace function public.get_actor_data(actor_id uuid)
returns jsonb as $$
declare
  _profile record;
begin
  select id, username, display_name, avatar_url
    into _profile
    from public.profiles
    where id = actor_id;

  if not found then return '{}'::jsonb; end if;

  return jsonb_build_object(
    'actor_id',           _profile.id,
    'actor_username',     _profile.username,
    'actor_display_name', _profile.display_name,
    'actor_avatar_url',   _profile.avatar_url
  );
end;
$$ language plpgsql security definer stable;

-- ─── 3. Helper: check if actor is blocked by recipient ───────

create or replace function public.is_blocked(actor uuid, recipient uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_blocks
    where user_id = recipient and blocked_id = actor
  );
end;
$$ language plpgsql security definer stable;

-- ─── 4. Helper: truncate text for notification body ──────────

create or replace function public.truncate_text(txt text, max_len int default 100)
returns text as $$
begin
  if txt is null or length(txt) = 0 then return null; end if;
  if length(txt) <= max_len then return txt; end if;
  return left(txt, max_len) || '…';
end;
$$ language plpgsql immutable;

-- ─── 5. Notify on follow ─────────────────────────────────────

create or replace function public.notify_on_follow()
returns trigger as $$
declare
  _actor jsonb;
  _name  text;
begin
  -- Skip self-follow (shouldn't happen, but guard)
  if NEW.follower_id = NEW.following_id then return NEW; end if;

  -- Skip if blocked
  if public.is_blocked(NEW.follower_id, NEW.following_id) then return NEW; end if;

  _actor := public.get_actor_data(NEW.follower_id);
  _name  := coalesce(_actor->>'actor_display_name', _actor->>'actor_username', 'Someone');

  insert into public.notifications (user_id, type, title, body, data)
  values (
    NEW.following_id,
    'follow',
    _name || ' started following you',
    null,
    _actor
  );

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_follow_notify
  after insert on public.follows
  for each row execute procedure public.notify_on_follow();

-- ─── 6. Notify on like ───────────────────────────────────────

create or replace function public.notify_on_like()
returns trigger as $$
declare
  _actor      jsonb;
  _name       text;
  _recipient  uuid;
  _body       text;
  _data       jsonb;
  _post_row   record;
  _comment_row record;
begin
  _actor := public.get_actor_data(NEW.user_id);
  _name  := coalesce(_actor->>'actor_display_name', _actor->>'actor_username', 'Someone');

  if NEW.target_type = 'post' then
    -- Look up post author + content
    select user_id, content into _post_row
      from public.posts where id = NEW.target_id;

    if not found then return NEW; end if;

    _recipient := _post_row.user_id;

    -- Skip self-like
    if NEW.user_id = _recipient then return NEW; end if;
    -- Skip if blocked
    if public.is_blocked(NEW.user_id, _recipient) then return NEW; end if;

    _body := public.truncate_text(_post_row.content);
    _data := _actor || jsonb_build_object('post_id', NEW.target_id);

    insert into public.notifications (user_id, type, title, body, data)
    values (_recipient, 'like', _name || ' liked your post', _body, _data);

  elsif NEW.target_type = 'comment' then
    -- Look up comment author + content + post_id
    select user_id, content, post_id into _comment_row
      from public.comments where id = NEW.target_id;

    if not found then return NEW; end if;

    _recipient := _comment_row.user_id;

    -- Skip self-like
    if NEW.user_id = _recipient then return NEW; end if;
    -- Skip if blocked
    if public.is_blocked(NEW.user_id, _recipient) then return NEW; end if;

    _body := public.truncate_text(_comment_row.content);
    _data := _actor || jsonb_build_object(
      'comment_id', NEW.target_id,
      'post_id',    _comment_row.post_id
    );

    insert into public.notifications (user_id, type, title, body, data)
    values (_recipient, 'like', _name || ' liked your comment', _body, _data);
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_like_notify
  after insert on public.likes
  for each row execute procedure public.notify_on_like();

-- ─── 7. Notify on comment (+ reply) ─────────────────────────

create or replace function public.notify_on_comment()
returns trigger as $$
declare
  _actor         jsonb;
  _name          text;
  _post_author   uuid;
  _parent_author uuid;
  _body          text;
  _data          jsonb;
  _notified_ids  uuid[] := '{}';
begin
  _actor := public.get_actor_data(NEW.user_id);
  _name  := coalesce(_actor->>'actor_display_name', _actor->>'actor_username', 'Someone');
  _body  := public.truncate_text(NEW.content);

  -- 1. Notify post author
  select user_id into _post_author from public.posts where id = NEW.post_id;

  if found and _post_author is not null
     and _post_author != NEW.user_id
     and not public.is_blocked(NEW.user_id, _post_author)
  then
    _data := _actor || jsonb_build_object(
      'post_id',    NEW.post_id,
      'comment_id', NEW.id
    );

    insert into public.notifications (user_id, type, title, body, data)
    values (_post_author, 'comment', _name || ' commented on your post', _body, _data);

    _notified_ids := _notified_ids || _post_author;
  end if;

  -- 2. If this is a reply, notify parent comment author
  if NEW.parent_id is not null then
    select user_id into _parent_author from public.comments where id = NEW.parent_id;

    if found and _parent_author is not null
       and _parent_author != NEW.user_id
       and _parent_author != all(_notified_ids)
       and not public.is_blocked(NEW.user_id, _parent_author)
    then
      _data := _actor || jsonb_build_object(
        'post_id',           NEW.post_id,
        'comment_id',        NEW.id,
        'parent_comment_id', NEW.parent_id
      );

      insert into public.notifications (user_id, type, title, body, data)
      values (_parent_author, 'comment', _name || ' replied to your comment', _body, _data);

      _notified_ids := _notified_ids || _parent_author;
    end if;
  end if;

  -- 3. Parse @mentions in comment content
  perform public.notify_on_mentions(
    NEW.user_id,
    NEW.content,
    'comment',
    NEW.post_id,
    NEW.id,
    _notified_ids
  );

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_comment_notify
  after insert on public.comments
  for each row execute procedure public.notify_on_comment();

-- ─── 8. Notify on repost ─────────────────────────────────────

create or replace function public.notify_on_repost()
returns trigger as $$
declare
  _actor     jsonb;
  _name      text;
  _recipient uuid;
  _content   text;
  _data      jsonb;
begin
  -- Look up original post author
  select user_id, content into _recipient, _content
    from public.posts where id = NEW.post_id;

  if not found then return NEW; end if;

  -- Skip self-repost
  if NEW.user_id = _recipient then return NEW; end if;
  -- Skip if blocked
  if public.is_blocked(NEW.user_id, _recipient) then return NEW; end if;

  _actor := public.get_actor_data(NEW.user_id);
  _name  := coalesce(_actor->>'actor_display_name', _actor->>'actor_username', 'Someone');

  _data := _actor || jsonb_build_object('post_id', NEW.post_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    _recipient,
    'repost',
    _name || ' reposted your post',
    public.truncate_text(_content),
    _data
  );

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_repost_notify
  after insert on public.reposts
  for each row execute procedure public.notify_on_repost();

-- ─── 9. Mention helper (called from comment + post triggers) ─

create or replace function public.notify_on_mentions(
  _actor_id     uuid,
  _content      text,
  _source_type  text,      -- 'post' or 'comment'
  _post_id      uuid,
  _comment_id   uuid,      -- null if from a post
  _already_notified uuid[] default '{}'
)
returns void as $$
declare
  _match      text;
  _mentioned  record;
  _actor      jsonb;
  _name       text;
  _body       text;
  _data       jsonb;
  _title      text;
begin
  if _content is null or length(_content) = 0 then return; end if;

  _actor := public.get_actor_data(_actor_id);
  _name  := coalesce(_actor->>'actor_display_name', _actor->>'actor_username', 'Someone');
  _body  := public.truncate_text(_content);

  for _match in
    select (regexp_matches(_content, '@([a-zA-Z0-9_]+)', 'g'))[1]
  loop
    -- Look up the mentioned user
    select id, username into _mentioned
      from public.profiles
      where lower(username) = lower(_match);

    if not found then continue; end if;

    -- Skip self-mention
    if _mentioned.id = _actor_id then continue; end if;

    -- Skip if already notified (e.g., post author got a comment notification)
    if _mentioned.id = any(_already_notified) then continue; end if;

    -- Skip if blocked
    if public.is_blocked(_actor_id, _mentioned.id) then continue; end if;

    if _source_type = 'post' then
      _title := _name || ' mentioned you in a post';
    else
      _title := _name || ' mentioned you in a comment';
    end if;

    _data := _actor || jsonb_build_object('post_id', _post_id);
    if _comment_id is not null then
      _data := _data || jsonb_build_object('comment_id', _comment_id);
    end if;

    insert into public.notifications (user_id, type, title, body, data)
    values (_mentioned.id, 'mention', _title, _body, _data);
  end loop;
end;
$$ language plpgsql security definer;

-- ─── 10. Notify on post mentions ─────────────────────────────

create or replace function public.notify_on_post_mention()
returns trigger as $$
begin
  -- Only parse mentions for regular posts (not reposts)
  if NEW.type is null or NEW.type != 'repost' then
    perform public.notify_on_mentions(
      NEW.user_id,
      NEW.content,
      'post',
      NEW.id,
      null,
      '{}'
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_post_mention_notify
  after insert on public.posts
  for each row execute procedure public.notify_on_post_mention();
