-- Update generated newsroom attribution only; preserve all editorial text changes.
begin;
create or replace function public.newsroom_create_curated_draft(suggestion_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare story public.newsroom_suggestions%rowtype; created_id uuid; story_slug text;
begin
  if public.newsroom_current_role() is distinct from 'editor' then raise exception 'Editor access required' using errcode = '42501'; end if;
  select * into story from public.newsroom_suggestions where id = suggestion_id for update;
  if not found then raise exception 'Suggestion unavailable'; end if;
  if story.article_id is not null then return story.article_id; end if;
  if story.status <> 'new' then raise exception 'Restore this suggestion before preparing a draft'; end if;
  story_slug := coalesce(nullif(trim(both '-' from left(regexp_replace(lower(story.headline), '[^a-z0-9]+', '-', 'g'), 150)), ''), 'curated-story') || '-' || story.id::text;
  insert into public.newsroom_articles(category_id,title,slug,dek,body,author,image_url,image_alt,status,owner_id,content_blocks,source_name,source_url,source_published_at)
  values (story.category_id,story.headline,story_slug,
    'A report from ' || story.source_name || ', selected by The Brief and Beyond. Follow the source link to read the original report.',
    'This is a curated link to reporting published by ' || story.source_name || '.',
    'The Brief and Beyond curation desk','','','draft',auth.uid(),
    jsonb_build_array(jsonb_build_object('type','link','url',story.source_url,'caption','Read the original report at ' || story.source_name)),
    story.source_name,story.source_url,story.source_published_at)
  returning id into created_id;
  update public.newsroom_suggestions set status='drafted',article_id=created_id,reviewed_by=auth.uid(),reviewed_at=now() where id=story.id;
  return created_id;
end;
$$;

update public.newsroom_articles set author = 'The Brief and Beyond curation desk'
where source_url is not null and author = 'The Civic Ledger curation desk';
update public.newsroom_articles
set dek = 'A report from ' || source_name || ', selected by The Brief and Beyond. Follow the source link to read the original report.'
where source_url is not null and dek = 'A report from ' || source_name || ', selected by The Civic Ledger. Follow the source link to read the original report.';
commit;
