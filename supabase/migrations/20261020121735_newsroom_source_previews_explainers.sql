begin;
alter table public.newsroom_suggestions add column source_preview text not null default '' check (length(source_preview) <= 1000);
create or replace function public.newsroom_valid_article_blocks(blocks jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare b jsonb;
begin
  if jsonb_typeof(blocks) <> 'array' or jsonb_array_length(blocks) > 100 then return false; end if;
  for b in select value from jsonb_array_elements(blocks) loop
    if jsonb_typeof(b) <> 'object' or coalesce(b->>'type', '') not in ('text', 'audio', 'video', 'link', 'explainer') then return false; end if;
    if b->>'type' = 'text' then
      if coalesce(length(b->>'text'), 0) = 0 or length(b->>'text') > 50000 then return false; end if;
    elsif coalesce(b->>'url', '') !~* '^https?://[^[:space:]]+$' then return false;
    end if;
  end loop;
  return true;
end;
$$;

create function public.newsroom_refresh_source_previews(items jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; inserted integer := 0; new_id uuid;
begin
  if public.newsroom_current_role() is distinct from 'editor' then raise exception 'Editor access required' using errcode='42501'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items)>100 then raise exception 'Invalid source batch'; end if;
  for item in select value from jsonb_array_elements(items) loop
    insert into public.newsroom_suggestions(category_id,source_id,source_name,source_url,headline,source_published_at,source_preview)
    values ((item->>'category_id')::uuid,item->>'source_id',item->>'source_name',item->>'source_url',item->>'headline',(item->>'source_published_at')::timestamptz,coalesce(item->>'source_preview',''))
    on conflict(source_url) do nothing returning id into new_id;
    if found then inserted:=inserted+1;
    else
      update public.newsroom_suggestions set source_preview=coalesce(item->>'source_preview','')
      where source_url=item->>'source_url' and source_preview is distinct from coalesce(item->>'source_preview','');
    end if;
  end loop;
  return inserted;
end;
$$;
revoke all on function public.newsroom_refresh_source_previews(jsonb) from public,anon;
grant execute on function public.newsroom_refresh_source_previews(jsonb) to authenticated;

create function public.newsroom_prepare_brief(suggestion_id uuid, brief text, explainers jsonb default '[]'::jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare story public.newsroom_suggestions%rowtype; created_id uuid; topic jsonb; blocks jsonb;
begin
  if public.newsroom_current_role() is distinct from 'editor' then raise exception 'Editor access required' using errcode='42501'; end if;
  if length(trim(brief))<10 or length(brief)>2000 then raise exception 'Add a short summary between 10 and 2000 characters'; end if;
  if jsonb_typeof(explainers)<>'array' or jsonb_array_length(explainers)>4 then raise exception 'Choose up to four background links'; end if;
  for topic in select value from jsonb_array_elements(explainers) loop
    if coalesce(topic->>'title','')='' or length(topic->>'title')>200 or coalesce(topic->>'url','') !~ '^https://en[.]wikipedia[.]org/wiki/[^[:space:]?#]+$' then raise exception 'Invalid Wikipedia link'; end if;
  end loop;
  select * into story from public.newsroom_suggestions where id=suggestion_id for update;
  if not found then raise exception 'Suggestion unavailable'; end if;
  if story.article_id is not null then return story.article_id; end if;
  created_id:=public.newsroom_create_curated_draft(suggestion_id);
  select content_blocks into blocks from public.newsroom_articles where id=created_id;
  for topic in select value from jsonb_array_elements(explainers) loop
    blocks:=blocks || jsonb_build_array(jsonb_build_object('type','explainer','url',topic->>'url','caption',topic->>'title'));
  end loop;
  update public.newsroom_articles set dek=trim(brief),body='',content_blocks=blocks where id=created_id;
  return created_id;
end;
$$;
revoke all on function public.newsroom_prepare_brief(uuid,text,jsonb) from public,anon;
grant execute on function public.newsroom_prepare_brief(uuid,text,jsonb) to authenticated;
commit;
