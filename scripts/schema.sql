-- PiggyTech Sentiment — MySQL schema
-- Run this once on your MySQL database before first use.

CREATE TABLE IF NOT EXISTS tweets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  tweet_id        VARCHAR(255)  NOT NULL,
  tweet_text      TEXT          NOT NULL,
  author_username VARCHAR(255)  DEFAULT '',
  author_name     VARCHAR(255)  DEFAULT '',
  products_detected TEXT        DEFAULT '[]',
  overall_sentiment VARCHAR(50) DEFAULT 'neutral',
  intent          VARCHAR(50)   DEFAULT 'opinion',
  aspect_product  VARCHAR(100)  DEFAULT '',
  aspect          VARCHAR(100)  DEFAULT '',
  aspect_sentiment VARCHAR(50)  DEFAULT '',
  created_at      DATETIME,
  inserted_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  -- Prevents duplicate (tweet + aspect) pairs, same as the old Postgres ON CONFLICT
  UNIQUE KEY unique_tweet_aspect (tweet_id(191), aspect(64))
);
