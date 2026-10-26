// 验证歌曲模块：读目录、加歌（拷文件 + 写 data.json）、删条目、断链检测。
//
//   node scripts/test-songs.cjs
//
// 全在沙盒里做，不碰 img-library。

const fs = require('node:fs');
const path = require('node:path');
const { loadSongs, addSong, removeSong, slugify } = require('../electron/songs.cjs');

const root = path.join(__dirname, '..');
const sandbox = path.join(root, '_scratch', 'ssandbox');
const course = path.join(sandbox, 'ChineseSongs');

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}${extra ? '  ' + extra : ''}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${extra ? '  ' + extra : ''}`);
  }
}

// ── 建沙盒 ─────────────────────────────────────────────────────────
fs.rmSync(sandbox, { recursive: true, force: true });
fs.mkdirSync(path.join(course, 'audio'), { recursive: true });
fs.mkdirSync(path.join(course, 'lyric'), { recursive: true });
fs.writeFileSync(
  path.join(course, 'data.json'),
  JSON.stringify(
    {
      title: '中文歌曲',
      titleEn: 'Chinese Songs',
      categories: [
        {
          name: '儿歌',
          en: 'Children Songs',
          items: [
            {
              name: '孩子的天空',
              en: "Children's Sky",
              audio: "/audio/children's-sky.mp3",
              lyric: "/lyric/children's-sky.lrc",
            },
            // 故意指向一个不存在的文件，验证断链检测
            {
              name: '断链的歌',
              en: 'Broken Link',
              audio: '/audio/broken.mp3',
              lyric: '/lyric/broken.lrc',
            },
          ],
        },
      ],
    },
    null,
    2
  ),
  'utf8'
);
// 第一首的文件是真的
fs.writeFileSync(path.join(course, 'audio', "children's-sky.mp3"), 'fake-audio');
fs.writeFileSync(path.join(course, 'lyric', "children's-sky.lrc"), '[00:01.00]测试');
// 一个没人引用的孤儿文件
fs.writeFileSync(path.join(course, 'audio', 'orphan.mp3'), 'orphan');
console.log('沙盒已就绪\n');

// ── 读 ─────────────────────────────────────────────────────────────
console.log('读：');
const loaded = loadSongs(sandbox, 'ChineseSongs');
check('读到条目', loaded.rows.length === 2, `${loaded.rows.length} 条`);
check('读到分类名', loaded.categories.includes('儿歌'));
const good = loaded.rows[0];
const broken = loaded.rows[1];
check('文件存在判定（有）', good.audioExists === true && good.lyricExists === true);
check('文件存在判定（缺）', broken.audioExists === false, '断链被识别');
check('孤儿文件被列出', loaded.orphans.includes('audio/orphan.mp3'), loaded.orphans.join(','));

// ── slug ───────────────────────────────────────────────────────────
console.log('\n文件名：');
check(
  "英文转 slug（保留撇号）",
  slugify("Children's Sky") === "children's-sky",
  slugify("Children's Sky")
);
check('中文被去掉', slugify('孩子的天空') === '' || /^song-\d+$/.test(slugify('孩子的天空')), slugify('孩子的天空'));

// ── 加歌 ───────────────────────────────────────────────────────────
console.log('\n加歌：');
const srcAudio = path.join(sandbox, 'src-audio.mp3');
const srcLyric = path.join(sandbox, 'src-lyric.lrc');
fs.writeFileSync(srcAudio, 'audio-bytes');
fs.writeFileSync(srcLyric, 'lyric-bytes');

const added = addSong(sandbox, 'ChineseSongs', {
  category: '儿歌',
  name: '勇气大爆发',
  en: 'Courage Explosion',
  audioSrc: srcAudio,
  lyricSrc: srcLyric,
});
check('返回成功', added.ok === true);
check(
  '音频文件被拷进去',
  fs.existsSync(path.join(course, 'audio', 'courage-explosion.mp3')),
  added.audioName
);
check(
  '歌词文件被拷进去',
  fs.existsSync(path.join(course, 'lyric', 'courage-explosion.lrc')),
  added.lyricName
);
const after = loadSongs(sandbox, 'ChineseSongs');
check('目录多了一条', after.rows.length === 3, `${after.rows.length} 条`);
const newRow = after.rows.find((r) => r.name === '勇气大爆发');
check('audio 字段带 /audio/', newRow?.audio === '/audio/courage-explosion.mp3', newRow?.audio);
check('文件确实在磁盘上', newRow?.audioExists === true);

// ── 重复与安全 ─────────────────────────────────────────────────────
console.log('\n安全：');
let blocked = false;
try {
  addSong(sandbox, 'ChineseSongs', { category: '儿歌', name: '勇气大爆发', en: 'x', audioSrc: srcAudio });
} catch {
  blocked = true;
}
check('同名拒绝重复插入', blocked);

blocked = false;
try {
  addSong(sandbox, 'ChineseSongs', { category: '儿歌', name: '没音频', en: 'no audio', audioSrc: '' });
} catch {
  blocked = true;
}
check('没选音频文件被拒', blocked);

blocked = false;
try {
  addSong(sandbox, 'ChineseSongs', { category: '儿歌', name: '', en: 'x', audioSrc: srcAudio });
} catch {
  blocked = true;
}
check('空歌名被拒', blocked);

blocked = false;
try {
  addSong(sandbox, 'KnowledgeBase', { category: 'x', name: 'y', en: 'z', audioSrc: srcAudio });
} catch {
  blocked = true;
}
check('非歌曲课程被拒', blocked);

// ── 删除 ───────────────────────────────────────────────────────────
console.log('\n删除：');
const rmKey = after.rows.find((r) => r.name === '勇气大爆发').key;
const rm = removeSong(sandbox, 'ChineseSongs', rmKey);
check('删除成功', rm.ok === true);
const afterRm = loadSongs(sandbox, 'ChineseSongs');
check('目录少一条', afterRm.rows.length === 2, `${afterRm.rows.length} 条`);
check(
  '文件保留（不误删音频）',
  fs.existsSync(path.join(course, 'audio', 'courage-explosion.mp3'))
);

console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
fs.rmSync(sandbox, { recursive: true, force: true });
console.log('沙盒已清理');
process.exit(fail === 0 ? 0 : 1);
