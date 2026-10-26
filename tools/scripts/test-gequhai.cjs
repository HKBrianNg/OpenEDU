// 验证 gequhai 抓取模块里「不用联网也能测」的部分：
// 搜索表格解析、LRC 抽取、window 变量提取、音频格式嗅探、落盘写 data.json。
//
//   node scripts/test-gequhai.cjs
//
// 联网那几步（搜索/详情/下载）不在这里测 —— 站点有反爬，测了也不稳。
// 真要验证跑 scripts/probe-gequhai.cjs。

const fs = require('node:fs');
const path = require('node:path');
const {
  parseSearchTable,
  extractLrc,
  pickVar,
  plainLyrics,
  sniffAudioExt,
} = require('../electron/gequhai.cjs');
const { saveRemoteSong, loadSongs } = require('../electron/songs.cjs');

const root = path.join(__dirname, '..');
const sandbox = path.join(root, '_scratch', 'gsandbox');
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

// ── 搜索表格解析 ───────────────────────────────────────────────────
console.log('搜索表格解析：');
const html = `
<table>
  <tr><td>1</td><td><a href="/play/326" class="text-info">晴天</a></td><td>周杰伦</td></tr>
  <tr><td>2</td><td><a href="/play/327">七里香</a></td><td>周杰伦</td></tr>
  <tr><td>3</td><td><a href="/play/326">晴天</a></td><td>周杰伦</td></tr>
  <tr><td>4</td><td>没有链接的脏数据</td><td>x</td></tr>
</table>`;
const songs = parseSearchTable(html);
check('解析出歌曲', songs.length === 2, `${songs.length} 首`);
check('id 正确', songs[0]?.id === '326', songs[0]?.id);
check('标题正确', songs[0]?.title === '晴天', songs[0]?.title);
check('歌手正确', songs[0]?.artist === '周杰伦', songs[0]?.artist);
check('同 id 去重', songs.filter((s) => s.id === '326').length === 1);
check('脏数据不崩', parseSearchTable('<html></html>').length === 0);

// ── LRC 抽取 ───────────────────────────────────────────────────────
console.log('\nLRC 抽取：');
const pageHtml = `
<div id="content-lrc2">[00:12.00]故事的小黄花<br />[00:16.50]从出生那年就飘着<br /></div>
<script>window.play_id = 'ab12cd'; window.mp3_type = 0; window.mp3_title = '晴天';</script>`;
const lrc = extractLrc(pageHtml);
check('抽出两行', lrc.split('\n').length === 2, JSON.stringify(lrc));
check('保留时间戳', lrc.startsWith('[00:12.00]'), lrc.split('\n')[0]);
check('纯歌词去时间戳', plainLyrics(lrc).split('\n')[0] === '故事的小黄花', plainLyrics(lrc).split('\n')[0]);
check('没有歌词块时返回空', extractLrc('<div>没有</div>') === '');

// ── window 变量 ────────────────────────────────────────────────────
console.log('\nwindow 变量：');
check('取字符串', pickVar(pageHtml, 'play_id') === 'ab12cd', pickVar(pageHtml, 'play_id'));
check('取数字', pickVar(pageHtml, 'mp3_type') === '0', pickVar(pageHtml, 'mp3_type'));
check('取不到返回空', pickVar(pageHtml, 'nope') === '');

// ── 音频格式嗅探 ───────────────────────────────────────────────────
console.log('\n音频格式嗅探：');
const head = (s, pad = 12) => {
  const b = Buffer.alloc(pad);
  b.write(s, 0, 'ascii');
  return b;
};
check('ID3 → mp3', sniffAudioExt(head('ID3xxxx')) === '.mp3');
const mp3 = Buffer.alloc(12);
mp3[0] = 0xff;
mp3[1] = 0xfb;
check('帧头 → mp3', sniffAudioExt(mp3) === '.mp3');
const m4a = Buffer.alloc(12);
m4a.write('ftyp', 4, 'ascii');
check('ftyp → m4a', sniffAudioExt(m4a) === '.m4a');
check('OggS → ogg', sniffAudioExt(head('OggSxxx')) === '.ogg');
check('fLaC → flac', sniffAudioExt(head('fLaCxxx')) === '.flac');
check('未知格式返回 null', sniffAudioExt(head('????????')) === null);
check('太短返回 null', sniffAudioExt(Buffer.alloc(3)) === null);

// ── 落盘（模拟下载来的字节）───────────────────────────────────────
console.log('\n落盘：');
fs.rmSync(sandbox, { recursive: true, force: true });
fs.mkdirSync(path.join(course, 'audio'), { recursive: true });
fs.mkdirSync(path.join(course, 'lyric'), { recursive: true });
fs.writeFileSync(
  path.join(course, 'data.json'),
  JSON.stringify(
    { title: '中文歌曲', titleEn: 'Chinese Songs', categories: [{ name: '流行歌曲', en: 'Pop', items: [] }] },
    null,
    2
  ),
  'utf8'
);

const fakeMp3 = Buffer.alloc(64);
fakeMp3.write('ID3', 0, 'ascii');
const saved = saveRemoteSong(sandbox, 'ChineseSongs', {
  category: '流行歌曲',
  name: '晴天',
  en: 'Clear Sky',
  audioBuffer: fakeMp3,
  audioExt: '.mp3',
  lrc: '[00:12.00]故事的小黄花',
});
check('保存成功', saved.ok === true);
check(
  '音频落盘',
  fs.existsSync(path.join(course, 'audio', 'clear-sky.mp3')),
  saved.audioName
);
check('歌词落盘', fs.existsSync(path.join(course, 'lyric', 'clear-sky.lrc')));
const after = loadSongs(sandbox, 'ChineseSongs');
check('目录多一条', after.rows.length === 1, `${after.rows.length} 条`);
check('audio 字段正确', after.rows[0]?.audio === '/audio/clear-sky.mp3', after.rows[0]?.audio);
check('文件确实在', after.rows[0]?.audioExists === true && after.rows[0]?.lyricExists === true);

console.log('\n安全：');
let blocked = false;
try {
  saveRemoteSong(sandbox, 'ChineseSongs', { category: '流行歌曲', name: '晴天', en: 'x', audioBuffer: Buffer.alloc(0), audioExt: '.mp3' });
} catch {
  blocked = true;
}
check('空音频被拒', blocked);

blocked = false;
try {
  saveRemoteSong(sandbox, 'ChineseSongs', { category: '流行歌曲', name: '无格式', en: 'no-ext', audioBuffer: fakeMp3, audioExt: 'mp3' });
} catch {
  blocked = true;
}
check('扩展名不合法被拒', blocked);

blocked = false;
try {
  saveRemoteSong(sandbox, 'KnowledgeBase', { category: 'x', name: 'y', en: 'z', audioBuffer: fakeMp3, audioExt: '.mp3' });
} catch {
  blocked = true;
}
check('非歌曲课程被拒', blocked);

// 歌词可留空（有些歌抓不到词）
const noLrc = saveRemoteSong(sandbox, 'ChineseSongs', {
  category: '流行歌曲',
  name: '没歌词的歌',
  en: 'No Lyric',
  audioBuffer: fakeMp3,
  audioExt: '.mp3',
  lrc: '',
});
check('歌词为空也能存', noLrc.ok === true && noLrc.wroteLrc === false);

console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
fs.rmSync(sandbox, { recursive: true, force: true });
console.log('沙盒已清理');
process.exit(fail === 0 ? 0 : 1);
