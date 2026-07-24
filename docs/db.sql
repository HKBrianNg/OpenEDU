/*
function
*/

-- 从自定义 JWT 中提取当前用户的 UUID。
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
$$;

-- 从自定义 JWT 中提取当前用户的角色。
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role';
$$;

-- 自动将 updated_at 字段更新为当前时间的通用触发器函数。
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



/*
Table & Index
*/

-- 語言表
CREATE TABLE public.languages (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,  -- 'zh-CN', 'zh-TW', 'en'
  name          TEXT NOT NULL,         -- '简体中文', '繁體中文', 'English'
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_languages_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.languages (code, name, is_default, sort_order) VALUES
  ('zh-CN', '简体中文', true, 3),
  ('zh-TW', '繁體中文', false, 2),
  ('en',    'English',  false, 1);

-- 用户表
  -- pending: 邮箱已验证，等待管理员审核
  -- active: 审核通过，可正常使用
  -- disabled: 管理员禁用
  -- rejected: 管理员驳回
CREATE TABLE public.users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  nickname          TEXT DEFAULT '',
  avatar_url        TEXT DEFAULT '',
  role              TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('admin', 'author', 'reader')),
  status            TEXT NOT NULL DEFAULT 'pending' 
                    CHECK (status IN ('pending', 'active', 'disabled', 'rejected')),
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  rejected_reason   TEXT DEFAULT '',  -- 驳回原因
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- 用户偏好表
CREATE TABLE public.user_preferences (
  user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  language        VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
  theme           VARCHAR(20) NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_pref_language FOREIGN KEY (language) REFERENCES public.languages(code)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能读写自己的偏好"
  ON public.user_preferences FOR ALL
  USING (public.current_user_id() = user_id)
  WITH CHECK (public.current_user_id() = user_id);

CREATE OR REPLACE FUNCTION public.init_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, language)
  VALUES (NEW.id, 'zh-CN')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_user_created_init_prefs
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.init_user_preferences();  


-- 分类表
CREATE TABLE public.categories (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT DEFAULT '',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_sort_order ON public.categories(sort_order);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- 文章表
CREATE TABLE public.articles (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  summary         TEXT DEFAULT '',
  cover_image     TEXT DEFAULT '',
  category_id     BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  tags            JSONB DEFAULT '[]'::jsonb,
  author_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'draft' 
                  CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'unpublished')),
  published_at    TIMESTAMPTZ,
  rejected_reason TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_articles_author ON public.articles(author_id);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_published_at ON public.articles(published_at);
CREATE INDEX idx_articles_category ON public.articles(category_id);

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- 评论表
CREATE TABLE public.comments (
  id            BIGSERIAL PRIMARY KEY,
  article_id    BIGINT NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  parent_id     BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_article ON public.comments(article_id);

CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


--日志表
CREATE TABLE public.audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     BIGINT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  ip_address    INET,
  user_agent    TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- 绑定自动更新触发器
CREATE TRIGGER set_audit_logs_updated_at
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();