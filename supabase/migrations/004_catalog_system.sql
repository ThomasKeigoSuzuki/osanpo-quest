-- items テーブルに sub_category カラムを追加
ALTER TABLE items ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- 称号テーブル
CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL,
  condition_value TEXT,
  icon TEXT
);

-- ユーザー獲得称号
CREATE TABLE IF NOT EXISTS user_titles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title_id TEXT REFERENCES titles(id),
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, title_id)
);

-- RLS
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view titles" ON titles FOR SELECT USING (true);

ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own titles" ON user_titles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own titles" ON user_titles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーの表示称号
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_title_id TEXT;
