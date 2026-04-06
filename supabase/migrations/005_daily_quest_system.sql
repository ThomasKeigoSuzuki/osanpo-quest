CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quest_date DATE NOT NULL,
  quest_id UUID REFERENCES quests(id),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_date)
);

ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily quests" ON daily_quests FOR ALL USING (auth.uid() = user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
