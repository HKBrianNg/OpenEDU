-- migrations/003_songs.sql
-- 歌曲目录编辑工作区：每课程一行 JSONB 文档，形状与前端静态 data.json 完全一致
-- （依赖 001_init.sql 已创建的 update_updated_at() 函数，请按顺序执行）

CREATE TABLE IF NOT EXISTS song_data (
  course_id   TEXT PRIMARY KEY CHECK (course_id IN ('ChineseSongs', 'EnglishSongs')),
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 自动更新
DROP TRIGGER IF EXISTS song_data_updated_at ON song_data;
CREATE TRIGGER song_data_updated_at
  BEFORE UPDATE ON song_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
