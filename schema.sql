-- Cloudflare D1 스키마
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  nickname TEXT DEFAULT '익명',
  score INTEGER DEFAULT 0,
  wave INTEGER DEFAULT 1,
  words_correct INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);
