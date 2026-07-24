-- seed.sql
-- 创建时间：2026-07-24
-- 描述：填充默认数据

-- 默认语言
INSERT INTO public.languages (code, name, is_default, sort_order) VALUES
  ('zh-CN', '简体中文', TRUE, 1),
  ('zh-TW', '繁體中文', FALSE, 2),
  ('en', 'English', FALSE, 3)
ON CONFLICT (code) DO NOTHING;

-- 默认分类
INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('中文', 'Chinese', '中文', 1),
  ('英文', 'English', '英文', 2),
  ('科学', 'Science', '科学', 3)
ON CONFLICT (slug) DO NOTHING;