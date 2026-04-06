-- 匿名ユーザーもusersテーブルにINSERTできるようRLSポリシーを確認
-- (既に handle_new_user トリガーが SECURITY DEFINER で動作するため追加不要)

-- 匿名認証はSupabase Dashboardから有効化が必要:
-- Authentication → Providers → Anonymous Sign-Ins → Enable
