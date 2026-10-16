// src/controllers/songImportController.js
//
// gequhai.com 歌曲检索代理（仅 admin）。
// 浏览器直连 gequhai 会被 CORS + cookie 挑战挡住，所以由 worker 代抓。
//
// 当前只提供「搜索 + 歌词预览」；真正的「导入到目录」未开放（data.json 只存路径，
// mp3/lrc 文件还要另行落到 img-library 才能在前台播放），落盘方案确定后再补。

import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { searchSongs, getSongDetail } from '../dal/gequhai.js';

// ── 按歌手名搜索 ──
export const searchGequhaiController = async ({ lang, query }) => {
  const singer = String(query.singer ?? '').trim();

  if (!singer) {
    return json({
      code: 'GEQUHAI_SINGER_REQUIRED',
      message: getMessage('GEQUHAI_SINGER_REQUIRED', lang),
    }, 400);
  }

  try {
    const items = await searchSongs(singer);
    return json({
      code: 'GEQUHAI_SEARCHED',
      message: getMessage('GEQUHAI_SEARCHED', lang),
      data: { singer, total: items.length, items },
    });
  } catch (error) {
    return json({
      code: 'GEQUHAI_UPSTREAM_FAILED',
      message: error.message || getMessage('GEQUHAI_UPSTREAM_FAILED', lang),
    }, 502);
  }
};

// ── 单曲详情（含 LRC 歌词）──
export const getGequhaiSongController = async ({ lang, query }) => {
  const id = String(query.id ?? '').trim();

  if (!id) {
    return json({
      code: 'GEQUHAI_SONG_ID_REQUIRED',
      message: getMessage('GEQUHAI_SONG_ID_REQUIRED', lang),
    }, 400);
  }

  try {
    const song = await getSongDetail(id);
    if (!song.title && !song.lrc) {
      return json({
        code: 'GEQUHAI_NOT_FOUND',
        message: getMessage('GEQUHAI_NOT_FOUND', lang),
      }, 404);
    }
    return json({
      code: 'GEQUHAI_SONG_RETRIEVED',
      message: getMessage('GEQUHAI_SONG_RETRIEVED', lang),
      data: song,
    });
  } catch (error) {
    return json({
      code: 'GEQUHAI_UPSTREAM_FAILED',
      message: error.message || getMessage('GEQUHAI_UPSTREAM_FAILED', lang),
    }, 502);
  }
};
