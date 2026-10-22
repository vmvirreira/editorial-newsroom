-- Give every existing story a stable slot without changing the visible order.
with ranked as (
  select id, (row_number() over (partition by status order by position, published_at desc, id) - 1)::integer as slot
  from public.newsroom_articles
)
update public.newsroom_articles a set position = ranked.slot
from ranked where a.id = ranked.id and a.position is distinct from ranked.slot;

-- Saving and moving share the same lock so concurrent publications cannot take the same slot.
create or replace function public.save_newsroom_article(article_id uuid, fields jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare existing public.newsroom_articles%rowtype; saved_id uuid; next_position integer; next_status text := fields->>'status';
begin
  if auth.uid() is null or public.newsroom_current_role() is null then raise exception 'Staff access required'; end if;
  if next_status is null or next_status not in ('draft','review','published') then raise exception 'Invalid status'; end if;
  perform pg_advisory_xact_lock(614102026);
  if article_id is not null then
    select * into existing from public.newsroom_articles where id = article_id for update;
    if not found then raise exception 'Article unavailable'; end if;
    next_position := existing.position;
  end if;
  if article_id is null or existing.status is distinct from next_status then
    if next_status = 'published' then
      select coalesce(min(position), 1) - 1 into next_position from public.newsroom_articles where status = next_status;
    else
      select coalesce(max(position), -1) + 1 into next_position from public.newsroom_articles where status = next_status;
    end if;
  end if;
  if article_id is null then
    insert into public.newsroom_articles (category_id,title,slug,dek,body,author,image_url,image_alt,status,is_featured,published_at,content_blocks,owner_id,position)
    values ((fields->>'category_id')::uuid,fields->>'title',fields->>'slug',fields->>'dek',coalesce(fields->>'body',''),fields->>'author',coalesce(fields->>'image_url',''),coalesce(fields->>'image_alt',''),next_status,(fields->>'is_featured')::boolean,(fields->>'published_at')::timestamptz,fields->'content_blocks',auth.uid(),next_position)
    returning id into saved_id;
  else
    update public.newsroom_articles set category_id=(fields->>'category_id')::uuid,title=fields->>'title',slug=fields->>'slug',dek=fields->>'dek',body=coalesce(fields->>'body',''),author=fields->>'author',image_url=coalesce(fields->>'image_url',''),image_alt=coalesce(fields->>'image_alt',''),status=next_status,is_featured=(fields->>'is_featured')::boolean,published_at=(fields->>'published_at')::timestamptz,content_blocks=fields->'content_blocks',position=next_position
    where id=article_id returning id into saved_id;
    if saved_id is null then raise exception 'Article unavailable for editing'; end if;
  end if;
  return saved_id;
end;
$$;
revoke all on function public.save_newsroom_article(uuid,jsonb) from public, anon;
grant execute on function public.save_newsroom_article(uuid,jsonb) to authenticated;

create or replace function public.move_newsroom_article(article_id uuid, target_status text, before_id uuid default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare ordered_ids uuid[]; item uuid; n integer := 0; previous_status text; destination uuid := before_id;
begin
  if public.newsroom_current_role() is distinct from 'editor' then raise exception 'Editor access required'; end if;
  if target_status is null or target_status not in ('draft', 'review', 'published') then raise exception 'Invalid status'; end if;
  perform pg_advisory_xact_lock(614102026);
  select status into previous_status from public.newsroom_articles where id = article_id for update;
  if not found then raise exception 'Article not found'; end if;
  if destination = article_id then return; end if;
  if destination is not null and not exists (select 1 from public.newsroom_articles where id = destination and status = target_status) then raise exception 'Destination has changed; refresh the board'; end if;
  select array_agg(id order by position, id) into ordered_ids from public.newsroom_articles where status = target_status and id <> article_id;
  -- A new publication defaults to first place. Explicit drop targets still take precedence.
  if target_status = 'published' and previous_status <> 'published' and destination is null then destination := ordered_ids[1]; end if;
  update public.newsroom_articles set status = target_status,
    published_at = case when target_status = 'published' and previous_status <> 'published' and published_at <= now() then now() else published_at end
    where id = article_id;
  foreach item in array coalesce(ordered_ids, array[]::uuid[]) loop
    if item = destination then
      update public.newsroom_articles set position = n where id = article_id; n := n + 1;
    end if;
    update public.newsroom_articles set position = n where id = item; n := n + 1;
  end loop;
  if destination is null then update public.newsroom_articles set position = n where id = article_id; end if;
end;
$$;
revoke all on function public.move_newsroom_article(uuid,text,uuid) from public, anon;
grant execute on function public.move_newsroom_article(uuid,text,uuid) to authenticated;
