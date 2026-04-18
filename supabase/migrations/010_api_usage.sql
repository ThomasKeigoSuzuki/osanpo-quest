-- API 呼び出し回数を記録するテーブル（レート制限用）
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_action_time ON api_usage(user_id, action, created_at DESC);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON api_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON api_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 古いレコードの自動削除（7日以上前）
-- Supabase の pg_cron がある場合:
-- SELECT cron.schedule('cleanup-api-usage', '0 3 * * *', $$DELETE FROM api_usage WHERE created_at < NOW() - INTERVAL '7 days'$$);
