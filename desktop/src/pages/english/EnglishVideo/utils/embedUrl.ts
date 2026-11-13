// client/src/books/EnglishVideo/utils/embedUrl.ts
//
// 把观看链接转成可 iframe 内嵌的播放地址。
//
// 数据里的 url 有三种，只有第一种能内嵌：
//   1. 真实视频：youtube.com/watch?v=<11位ID>、youtu.be/<ID>、/shorts/<ID>、bilibili.com/video/BVxxx
//   2. 搜索页：  youtube.com/results?search_query=...（X-Frame-Options 禁止嵌入）
//   3. 占位链接：watch?v=REAL_ID_P2_1 之类的假 ID
//
// 所以对 YouTube ID 做「11 位、字母数字-_」的格式校验，不合规一律返回 null，
// 由观看页降级为「打开原链接」按钮。宁可降级，也不要嵌出一个播放器壳子。

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * 起始播放位置：分享链接里常带 &t=64s（或 t=1m4s、start=64），
 * 内嵌时对应的是 ?start=<秒>。丢掉的话会从 0 开始播，前面那段开场白又得看一遍。
 */
function startQuery(u: URL): string {
  const raw = u.searchParams.get('t') || u.searchParams.get('start') || '';
  if (!raw) return '';
  if (/^\d+$/.test(raw)) return `?start=${raw}`;
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!m) return '';
  const sec = Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  return sec > 0 ? `?start=${sec}` : '';
}

export function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.split('/')[1] || '';
      return YT_ID.test(id) ? `https://www.youtube.com/embed/${id}${startQuery(u)}` : null;
    }

    // www.youtube.com / m.youtube.com
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.split('/')[2] || '';
        return YT_ID.test(id) ? url : null;
      }
      // /shorts/<id> —— Shorts 分享出来的链接长这样，同样可以内嵌。
      // 不认的话就会降级成「打开原链接」按钮，白瞎一个能站内播的视频。
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2] || '';
        return YT_ID.test(id) ? `https://www.youtube.com/embed/${id}${startQuery(u)}` : null;
      }

      const v = u.searchParams.get('v');
      // results?search_query=... 没有 v 参数，自然落到 null
      return v && YT_ID.test(v) ? `https://www.youtube.com/embed/${v}${startQuery(u)}` : null;
    }

    // www.bilibili.com/video/BVxxx
    if (/(^|\.)bilibili\.com$/.test(u.hostname)) {
      const m = u.pathname.match(/\/video\/(BV[A-Za-z0-9]+)/);
      return m
        ? `https://player.bilibili.com/player.html?bvid=${m[1]}&autoplay=0&danmaku=0&high_quality=1`
        : null;
    }

    return null;
  } catch {
    return null;
  }
}
