-- 002_add_functions.sql
-- 创建时间：2026-07-24
-- 描述：添加数据库函数和触发器

-- 函数 1：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 函数 2：允许通过 API 执行 SQL（用于迁移脚本）
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为各表绑定触发器
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
    CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END 
$$;