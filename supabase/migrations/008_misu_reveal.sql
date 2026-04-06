ALTER TABLE users ADD COLUMN IF NOT EXISTS shinako_reveal_stage INT DEFAULT 1;

ALTER TABLE god_bonds ADD COLUMN IF NOT EXISTS offerings_count INT DEFAULT 0;
ALTER TABLE god_bonds ADD COLUMN IF NOT EXISTS reveal_stage INT DEFAULT 1;

CREATE TABLE IF NOT EXISTS offerings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  god_name TEXT NOT NULL,
  item_id UUID REFERENCES items(id) NOT NULL,
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id)
);

ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own offerings" ON offerings FOR ALL USING (auth.uid() = user_id);
