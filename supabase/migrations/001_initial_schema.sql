-- users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'ぼうけんしゃ',
  total_quests_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- local_gods（ご当地神）テーブル
CREATE TABLE local_gods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_code TEXT NOT NULL UNIQUE,
  area_name TEXT NOT NULL,
  god_name TEXT NOT NULL,
  personality TEXT NOT NULL,
  speech_style TEXT NOT NULL,
  first_person TEXT NOT NULL,
  sample_greeting TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- quests テーブル
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  god_type TEXT NOT NULL CHECK (god_type IN ('wanderer', 'local')),
  god_name TEXT NOT NULL,
  local_god_id UUID REFERENCES local_gods(id),
  mission_text TEXT NOT NULL,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('direction', 'discovery', 'experience')),
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  start_area_name TEXT NOT NULL,
  goal_lat DOUBLE PRECISION NOT NULL,
  goal_lng DOUBLE PRECISION NOT NULL,
  goal_radius_meters INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 hours'),
  route_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quests_user_status ON quests(user_id, status);
CREATE INDEX idx_quests_user_created ON quests(user_id, created_at DESC);

-- items テーブル
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('material', 'local', 'crafted', 'treasure')),
  image_url TEXT,
  area_name TEXT,
  god_name TEXT NOT NULL,
  rarity INTEGER NOT NULL DEFAULT 1 CHECK (rarity BETWEEN 1 AND 5),
  obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_user ON items(user_id, obtained_at DESC);
CREATE INDEX idx_items_user_category ON items(user_id, category);

-- adventure_logs ビュー
CREATE VIEW adventure_logs AS
SELECT
  q.id AS quest_id,
  q.user_id,
  q.god_type,
  q.god_name,
  q.mission_text,
  q.mission_type,
  q.start_area_name,
  q.start_lat,
  q.start_lng,
  q.goal_lat,
  q.goal_lng,
  q.route_log,
  q.started_at,
  q.completed_at,
  q.status,
  i.id AS item_id,
  i.name AS item_name,
  i.description AS item_description,
  i.category AS item_category,
  i.image_url AS item_image_url,
  i.rarity AS item_rarity
FROM quests q
LEFT JOIN items i ON i.quest_id = q.id
WHERE q.status = 'completed'
ORDER BY q.completed_at DESC;

-- RLS ポリシー
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quests" ON quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quests" ON quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quests" ON quests FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own items" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE local_gods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view local gods" ON local_gods FOR SELECT USING (true);

-- Supabase Auth のトリガー: 新規ユーザー作成時に users テーブルに行を挿入
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'ぼうけんしゃ'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage バケット (アイテム画像用)
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

CREATE POLICY "Anyone can view item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');
