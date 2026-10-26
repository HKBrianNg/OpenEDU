// 验证 CDN 模块：URL 拼法、路径校验、条目计数、purge/probe 的结果解析。
//
//   node scripts/test-cdn.cjs
//
// 联网那部分用假 fetch 注入，不真发请求 —— 真清缓存会把线上缓存打掉。

const { purgeUrl, cdnUrl, countItems, purge, probe } = require('../electron/cdn.cjs');

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

// 假 fetch：把网络那一段换成可控的返回值
const fakeFetch = (handler) => async (url, init) => handler(url, init);

async function main() {
  console.log('URL 拼法：');
  check(
    'purge URL 指向 jsDelivr',
    purgeUrl('openEDU/ChineseSongs/data.json') ===
      'https://purge.jsdelivr.net/gh/HKBrianNg/img-library@main/openEDU/ChineseSongs/data.json',
    purgeUrl('openEDU/ChineseSongs/data.json')
  );
  check(
    'CDN URL 指向 cdn.jsdelivr.net',
    cdnUrl('openEDU/ChineseSongs/data.json') ===
      'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main/openEDU/ChineseSongs/data.json'
  );
  // 传 '/openEDU/...' 这种带前导斜杠的也要能认
  check('容忍前导斜杠', purgeUrl('/openEDU/x.json') === purgeUrl('openEDU/x.json'));

  console.log('\n路径校验：');
  const bad = (p) => {
    try {
      purgeUrl(p);
      return false;
    } catch {
      return true;
    }
  };
  check('拒绝 openEDU 以外的路径', bad('client/public/data/x.json'));
  check('拒绝 ../ 穿越', bad('openEDU/../../etc/passwd'));
  check('拒绝根路径', bad('/'));

  console.log('\n条目计数：');
  check(
    '累加各分类条目',
    countItems({ categories: [{ items: [1, 2, 3] }, { items: [4, 5] }, { items: [] }] }) === 5
  );
  check('空数据返回 0', countItems({}) === 0 && countItems(null) === 0);
  check('没有 categories 字段返回 0', countItems({ title: 'x' }) === 0);

  console.log('\npurge（假 fetch）：');
  const r1 = await purge(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({ ok: true, status: 200, json: async () => ({ id: 'abc', status: 'finished' }) }))
  );
  check('成功时 ok', r1.ok === true, r1.status);
  check('带上状态', r1.status === 'finished');

  const r2 = await purge(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({ ok: true, status: 200, json: async () => ({ id: 'abc', status: 'pending' }) }))
  );
  check('pending 也算成功', r2.ok === true && r2.status === 'pending');

  const r3 = await purge(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Too many requests' } }),
    }))
  );
  check('失败时带具体原因', r3.ok === false && r3.error === 'Too many requests', r3.error);

  const r4 = await purge(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({ ok: false, status: 502, json: async () => ({}) }))
  );
  check('拿不到原因时退回状态码', r4.ok === false && r4.error === 'HTTP 502', r4.error);

  const r5 = await purge('openEDU/ChineseSongs/data.json', () => {
    throw new Error('网络不通');
  });
  check('网络异常不抛出去', r5.ok === false && r5.error === '网络不通', r5.error);

  console.log('\nprobe（假 fetch）：');
  const p1 = await probe(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({
      ok: true,
      status: 200,
      headers: { get: (k) => (k === 'age' ? '123' : null) },
      text: async () =>
        JSON.stringify({
          categories: [{ items: [{ name: 'a' }, { name: 'b' }] }, { items: [{ name: 'c' }] }],
        }),
    }))
  );
  check('解析出条数', p1.count === 3, `${p1.count} 条`);
  check('带上缓存 age', p1.age === '123', String(p1.age));

  const p2 = await probe(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({ ok: false, status: 404, headers: { get: () => null }, text: async () => 'Not Found' }))
  );
  check('404 时 ok=false', p2.ok === false && p2.status === 404);

  const p3 = await probe(
    'openEDU/ChineseSongs/data.json',
    fakeFetch(() => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => '<html>不是 json</html>',
    }))
  );
  check('非 JSON 不崩，count 为 null', p3.ok === true && p3.count === null);

  console.log('\n安全：');
  let blocked = false;
  try {
    await purge('client/public/data/x.json', fakeFetch(() => ({ ok: true })));
  } catch {
    blocked = true;
  }
  check('非法路径在被发出去之前就拦掉', blocked);
}

main().then(() => {
  console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
  process.exit(fail === 0 ? 0 : 1);
});
