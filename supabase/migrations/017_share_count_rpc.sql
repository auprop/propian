-- Share count increment RPC
-- Used when a user shares a post (native share / clipboard copy)

create or replace function public.increment_share_count(post_id uuid)
returns void as $$
begin
  update public.posts set share_count = share_count + 1 where id = post_id;
end;
$$ language plpgsql security definer;
