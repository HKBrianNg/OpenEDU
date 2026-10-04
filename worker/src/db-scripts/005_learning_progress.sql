-- ============ learning_progress ============
CREATE TABLE IF NOT EXISTS learning_progress (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_name    TEXT NOT NULL DEFAULT 'EnglishWord',
  chapter_name   TEXT,
  group_name     TEXT,
  content_en     TEXT NOT NULL,
  content_zh     TEXT,
  status         TEXT NOT NULL DEFAULT 'learning'
                CHECK (status IN ('learning', 'mastered')),
  last_review_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 唯一约束：同一用户对同一课程、章节、分组、单词只能有一条记录
  CONSTRAINT learning_progress_unique 
    UNIQUE(user_id, course_name, chapter_name, group_name, content_en)
);

-- 索引：按用户查询时更快
CREATE INDEX idx_learning_progress_user 
  ON learning_progress(user_id, course_name);

-- 更新时间触发器
CREATE TRIGGER learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();