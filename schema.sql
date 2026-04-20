-- PiggyTech Sentiment — Neon Postgres schema
-- Run this ONCE in the Neon SQL editor after creating your project.
-- (Neon dashboard → your project → SQL Editor → paste this → Run)

CREATE TABLE IF NOT EXISTS tweets (
  id             SERIAL PRIMARY KEY,
  tweet_id       TEXT NOT NULL,
  tweet_text     TEXT NOT NULL DEFAULT '',
  author_username TEXT NOT NULL DEFAULT '',
  author_name    TEXT NOT NULL DEFAULT '',
  products_detected TEXT NOT NULL DEFAULT '[]',
  overall_sentiment TEXT NOT NULL DEFAULT '',
  intent         TEXT NOT NULL DEFAULT '',
  aspect_product TEXT NOT NULL DEFAULT '',
  aspect         TEXT NOT NULL DEFAULT '',
  aspect_sentiment TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT '',
  scraped_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one row per (tweet, aspect) pair
-- Handles tweets with multiple aspects and prevents duplicate inserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_tweets_unique
  ON tweets(tweet_id, aspect);

-- Indexes for dashboard filters
CREATE INDEX IF NOT EXISTS idx_tweets_sentiment   ON tweets(overall_sentiment);
CREATE INDEX IF NOT EXISTS idx_tweets_intent      ON tweets(intent);
CREATE INDEX IF NOT EXISTS idx_tweets_aspect      ON tweets(aspect);
CREATE INDEX IF NOT EXISTS idx_tweets_scraped_at  ON tweets(scraped_at DESC);
