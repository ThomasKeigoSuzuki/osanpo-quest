CREATE TABLE IF NOT EXISTS god_bonds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  god_name TEXT NOT NULL,
  god_type TEXT NOT NULL CHECK (god_type IN ('wanderer', 'local')),
  bond_level INT DEFAULT 1 CHECK (bond_level BETWEEN 1 AND 7),
  bond_exp INT DEFAULT 0,
  total_quests INT DEFAULT 0,
  first_met_at TIMESTAMPTZ DEFAULT NOW(),
  last_quest_at TIMESTAMPTZ,
  god_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, god_name)
);

ALTER TABLE god_bonds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own god bonds" ON god_bonds FOR ALL USING (auth.uid() = user_id);
