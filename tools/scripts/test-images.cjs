// 验证配图链路：prompt 拼法、URL、格式嗅探、图源解析、落盘与回写。
//
//   node scripts/test-images.cjs
//
// 联网那部分用假 fetch 注入 —— 真生图要十几秒一张，而且会把图写进仓库。
// 落盘/回写在 _scratch 沙盒里做，跑完删掉，不碰 img-library。

const fs = require('node:fs');
const path = require('node:path');
const {
  buildPrompt,
  pollinationsUrl,
  sniffImageExt,
  generateImage,
  commonsSearchUrl,
  pickCommonsImage,
  searchCommonsImage,
} = require('../electron/images.cjs');
const { saveImage, deleteImage, loadKnowledgeBase } = require('../electron/kb.cjs');

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

// 最小的合法图片头，够嗅探用
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 7)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 7)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(100, 7)]);

const fakeFetch = (handler) => async (url, init) => handler(url, init);
const okRes = (buf) => ({ ok: true, status: 200, arrayBuffer: async () => buf });

async function main() {
  console.log('prompt：');
  const p1 = buildPrompt({ title: '变色龙为什么会变色', titleEn: 'Why Do Chameleons Change Colour?' });
  check('用英文题目打头', p1.startsWith('Why Do Chameleons Change Colour?'));
  check('带插画风格词', p1.includes("children's science encyclopedia illustration"));
  check('明确不要文字水印', p1.includes('no text') && p1.includes('no watermark'));
  check('没有英文时退回中文', buildPrompt({ title: '车轮为什么是圆的' }).startsWith('车轮为什么是圆的'));

  const emptyPrompt = (() => {
    try {
      buildPrompt({});
      return false;
    } catch {
      return true;
    }
  })();
  check('空题目直接报错', emptyPrompt);

  console.log('\nURL：');
  const u = pollinationsUrl('a red fox', { width: 512, height: 512, seed: 42 });
  check('指向 Pollinations', u.startsWith('https://image.pollinations.ai/prompt/'));
  check('prompt 做了编码', u.includes('a%20red%20fox') && !u.includes(' '));
  check('带上尺寸与 nologo', u.includes('width=512') && u.includes('nologo=true') && u.includes('seed=42'));
  check('不传 seed 就不带', !pollinationsUrl('x').includes('seed'));
  check('Commons 用英文关键词', commonsSearchUrl('chameleon').includes('gsrsearch=chameleon'));
  check('Commons 限定文件命名空间', commonsSearchUrl('x').includes('gsrnamespace=6'));

  console.log('\n格式嗅探：');
  check('jpg', sniffImageExt(jpg) === '.jpg');
  check('png', sniffImageExt(png) === '.png');
  check('webp', sniffImageExt(webp) === '.webp');
  check('HTML 错误页不是图', sniffImageExt(Buffer.from('<html>503</html>')) === null);
  check('空 buffer 不是图', sniffImageExt(Buffer.alloc(0)) === null);
  check('非 buffer 不是图', sniffImageExt('ffd8ff') === null);

  console.log('\n文生图（假 fetch）：');
  const r1 = await generateImage('a fox', { fetchImpl: fakeFetch(() => okRes(jpg)) });
  check('拿到图就成功', r1.ok === true && r1.ext === '.jpg', `${r1.buffer?.length} 字节`);
  check('一次就成', r1.attempts === 1);

  let calls = 0;
  const flaky = fakeFetch(() => {
    calls++;
    if (calls < 3) {
      const e = new Error('HTTP 503');
      e.status = 503;
      throw e;
    }
    return okRes(png);
  });
  const r2 = await generateImage('a fox', { fetchImpl: flaky, retries: 3 });
  check('503 会退避重试', r2.ok === true && calls === 3, `重试 ${calls} 次`);

  const alwaysDown = fakeFetch(() => {
    const e = new Error('HTTP 503');
    e.status = 503;
    throw e;
  });
  const r3 = await generateImage('a fox', { fetchImpl: alwaysDown, retries: 2 });
  check('一直 503 就报错', r3.ok === false && r3.error.includes('503'), r3.error);

  const htmlErr = fakeFetch(() => okRes(Buffer.from('{"error":"overloaded"}')));
  const r4 = await generateImage('a fox', { fetchImpl: htmlErr, retries: 2 });
  check('200 但不是图片也算失败', r4.ok === false && r4.error.includes('不是图片'), r4.error);

  const badReq = fakeFetch(() => {
    const e = new Error('HTTP 400');
    e.status = 400;
    throw e;
  });
  let n400 = 0;
  const r5 = await generateImage('a fox', {
    fetchImpl: () => {
      n400++;
      return badReq();
    },
    retries: 3,
  });
  check('4xx 不重试（请求本身有问题）', r5.ok === false && n400 === 1, `请求 ${n400} 次`);

  console.log('\nCommons 解析：');
  const commonsJson = {
    query: {
      pages: {
        a: { title: 'File:x.svg', imageinfo: [{ thumburl: 'https://x/y.svg' }] },
        b: { title: 'File:chameleon.jpg', imageinfo: [{ thumburl: 'https://x/chameleon.jpg' }] },
      },
    },
  };
  const picked = pickCommonsImage(commonsJson);
  check('跳过 svg 拿位图', picked?.url === 'https://x/chameleon.jpg', picked?.title);
  check('空结果返回 null', pickCommonsImage({}) === null);
  check('没有 imageinfo 的跳过', pickCommonsImage({ query: { pages: { a: { title: 'x' } } } }) === null);

  const c1 = await searchCommonsImage('chameleon', {
    fetchImpl: fakeFetch(() => okRes(Buffer.from(JSON.stringify(commonsJson)))),
  });
  check('搜到图返回 url', c1.ok === true && c1.url.includes('chameleon'));

  const c2 = await searchCommonsImage('zzzz', {
    fetchImpl: fakeFetch(() => okRes(Buffer.from('{"query":{"pages":{}}}'))),
  });
  check('搜不到时明确报错', c2.ok === false && c2.error.includes('没找到'), c2.error);

  // ── 落盘 + 回写（沙盒）──
  console.log('\n落盘 + 回写（沙盒）：');
  const scratch = path.join(__dirname, '..', '_scratch', 'kb');
  fs.rmSync(scratch, { recursive: true, force: true });
  const courseDir = path.join(scratch, 'KnowledgeBase', 'content');
  fs.mkdirSync(courseDir, { recursive: true });

  const eol = '\r\n';
  const items = [
    { title: { zh: '第一题', en: 'First' }, content: { zh: 'x', en: 'y' } },
    { title: { zh: '第二题', en: 'Second' }, content: { zh: 'x', en: 'y' } },
  ];
  const raw = JSON.stringify(items, null, 2).replace(/\n/g, eol);
  fs.writeFileSync(path.join(courseDir, 'unit.json'), raw, 'utf8');
  fs.writeFileSync(
    path.join(scratch, 'KnowledgeBase', 'data.json'),
    JSON.stringify({ title: 't', titleEn: 't', chapters: [{ name: '单元', en: 'Unit', contentLink: 'unit.json' }] }, null, 2),
    'utf8'
  );

  const out = saveImage(scratch, { contentLink: 'unit.json', index: 1, file: '第二题.jpg' }, jpg);
  check('返回文件名与字节数', out.ok === true && out.file === '第二题.jpg' && out.bytes === jpg.length);
  check('图真的落在 content/', fs.existsSync(path.join(courseDir, '第二题.jpg')));

  const after = JSON.parse(fs.readFileSync(path.join(courseDir, 'unit.json'), 'utf8'));
  check('imageUrl 回写到指定下标', after[1].imageUrl === '第二题.jpg');
  check('没动其它条目', after[0].imageUrl === undefined);

  const afterRaw = fs.readFileSync(path.join(courseDir, 'unit.json'), 'utf8');
  check('CRLF 保持住了', afterRaw.includes('\r\n') && !afterRaw.includes('\n\n'));

  const loaded = loadKnowledgeBase(scratch);
  check('重新读取能看到图', loaded.rows.find((r) => r.title === '第二题')?.hasImage === true);

  console.log('\n拒绝非法输入：');
  const bad = (input, buf = jpg) => {
    try {
      saveImage(scratch, input, buf);
      return null;
    } catch (e) {
      return e.message;
    }
  };
  check('文件名带路径分隔符', Boolean(bad({ contentLink: 'unit.json', index: 0, file: 'a/b.jpg' })));
  check('文件名不是图片后缀', Boolean(bad({ contentLink: 'unit.json', index: 0, file: 'a.txt' })));
  check('空文件名', Boolean(bad({ contentLink: 'unit.json', index: 0, file: '  ' })));
  check('下标越界', Boolean(bad({ contentLink: 'unit.json', index: 99, file: 'a.jpg' })));
  check('没有图片数据', Boolean(bad({ contentLink: 'unit.json', index: 0, file: 'a.jpg' }, Buffer.alloc(0))));
  check(
    'contentLink 穿越',
    Boolean(bad({ contentLink: '../../data.json', index: 0, file: 'a.jpg' }))
  );

  console.log('\n删除配图（沙盒）：');
  const dup = path.join(courseDir, '第二题.jpg');
  check('删之前图在', fs.existsSync(dup));
  const del1 = deleteImage(scratch, { contentLink: 'unit.json', index: 1 });
  check('返回被删的文件名', del1.ok === true && del1.file === '第二题.jpg');
  check('图真的没了', !fs.existsSync(dup));
  const delAfter = JSON.parse(fs.readFileSync(path.join(courseDir, 'unit.json'), 'utf8'));
  check('imageUrl 清掉了', delAfter[1].imageUrl === undefined);
  check('没动相邻条目', delAfter[0].title.zh === '第一题');
  const delRaw = fs.readFileSync(path.join(courseDir, 'unit.json'), 'utf8');
  check('CRLF 还是保持住了', delRaw.includes('\r\n') && !delRaw.includes('\n\n'));

  const del2 = deleteImage(scratch, { contentLink: 'unit.json', index: 0 });
  check('本来就没图 → skipped', del2.ok === true && del2.skipped === true && del2.file === null);

  // 引用指着一张不存在的文件：清掉悬空引用才算自愈，文件本身不存在别报错
  saveImage(scratch, { contentLink: 'unit.json', index: 0, file: '悬空.jpg' }, jpg);
  fs.unlinkSync(path.join(courseDir, '悬空.jpg'));
  const del3 = deleteImage(scratch, { contentLink: 'unit.json', index: 0 });
  check(
    '引用悬空时不报错，且清掉引用',
    del3.ok === true && del3.hadFile === false,
    `hadFile=${del3.hadFile}`
  );
  check(
    '悬空引用确实清了',
    JSON.parse(fs.readFileSync(path.join(courseDir, 'unit.json'), 'utf8'))[0].imageUrl === undefined
  );

  const delBad = (input) => {
    try {
      deleteImage(scratch, input);
      return null;
    } catch (e) {
      return e.message;
    }
  };
  check('下标越界', Boolean(delBad({ contentLink: 'unit.json', index: 99 })));
  check('没给 contentLink', Boolean(delBad({ index: 0 })));
  check(
    '引用里带路径分隔符会被拒',
    (() => {
      // 手动塞一条恶意 imageUrl，确认删的时候不会顺着它删到别处
      const p = path.join(courseDir, 'unit.json');
      const src = fs.readFileSync(p, 'utf8');
      const items = JSON.parse(src);
      items[0].imageUrl = '..\\data.json';
      fs.writeFileSync(p, JSON.stringify(items, null, 2), 'utf8');
      const msg = delBad({ contentLink: 'unit.json', index: 0 });
      const survived = fs.existsSync(path.join(scratch, 'KnowledgeBase', 'data.json'));
      return Boolean(msg) && survived;
    })()
  );

  fs.rmSync(scratch, { recursive: true, force: true });
}

main().then(() => {
  console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
  process.exit(fail === 0 ? 0 : 1);
});
