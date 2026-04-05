-- local_gods テーブルに image_url カラムを追加
ALTER TABLE local_gods ADD COLUMN IF NOT EXISTS image_url TEXT;
