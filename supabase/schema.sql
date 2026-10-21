-- Supabase schema for piggytech-sentiment (project hxfqijycwcjefqpvmrfx)
-- Reads: anon can SELECT tweets (public tweet data).
-- Writes: only via ingest_tweets(secret, rows); the secret's sha256 lives in private.ingest_config.
create table public.tweets (
  id                bigint generated always as identity primary key,
  tweet_id          text not null,
  tweet_text        text not null,
  author_username   text default '',
  author_name       text default '',
  products_detected text default '',
  overall_sentiment text default '',
  intent            text default '',
  aspect_product    text default '',
  aspect            text default '',
  aspect_sentiment  text default '',
  target            text not null default 'piggytech',
  created_at        timestamptz,
  inserted_at       timestamptz not null default now()
);
create index tweets_created_at_idx on public.tweets (created_at desc);
create index tweets_tweet_id_idx on public.tweets (tweet_id);
alter table public.tweets enable row level security;
create policy "tweets are readable" on public.tweets for select to anon, authenticated using (true);

create schema if not exists private;
revoke all on schema private from anon, authenticated;
create table private.ingest_config (id int primary key default 1 check (id = 1), secret_hash text not null);
-- set it with: insert into private.ingest_config values (1, encode(extensions.digest('<SUPABASE_INGEST_SECRET>', 'sha256'), 'hex'));

create or replace function public.ingest_tweets(p_secret text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not exists (select 1 from private.ingest_config
                 where secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')) then
    raise exception 'unauthorized';
  end if;
  insert into public.tweets (tweet_id, tweet_text, author_username, author_name, products_detected,
    overall_sentiment, intent, aspect_product, aspect, aspect_sentiment, target, created_at)
  select r->>'tweet_id', r->>'tweet_text', coalesce(r->>'author_username',''), coalesce(r->>'author_name',''),
         coalesce(r->>'products_detected',''), coalesce(r->>'overall_sentiment',''), coalesce(r->>'intent',''),
         coalesce(r->>'aspect_product',''), coalesce(r->>'aspect',''), coalesce(r->>'aspect_sentiment',''),
         coalesce(r->>'target','piggytech'), nullif(r->>'created_at','')::timestamptz
  from jsonb_array_elements(p_rows) r
  where not exists (select 1 from public.tweets t where t.tweet_id = r->>'tweet_id');
  get diagnostics n = row_count;
  return n;
end; $$;
revoke all on function public.ingest_tweets(text, jsonb) from public;
grant execute on function public.ingest_tweets(text, jsonb) to anon, authenticated;
