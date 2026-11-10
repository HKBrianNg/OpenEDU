// utils/safeFetch.ts
// 静态课程 JSON 的安全拉取（音乐/书本模块共用），失败时抛出带上下文的 Error

export async function safeJsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${url}. ` +
        (text ? `Response starts with: ${text.slice(0, 200)}` : '')
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${url}, but got content-type: "${contentType}". ` +
        `Body starts with: ${text.slice(0, 300)}`
    );
  }

  return (await res.json()) as T;
}
