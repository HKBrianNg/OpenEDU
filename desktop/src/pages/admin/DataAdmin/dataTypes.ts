// DataAdmin 共享类型（渲染层与主进程 IPC 都用）

/** 本地仓库中的一个目录项，key 为相对数据根的 posix 路径 */
export interface DataEntry {
  key: string;
  title: string;
  isDir: boolean;
  size: number;
  mtime: number;
  ext: string;
}

export interface TextResult {
  text: string;
  size: number;
  truncated: boolean;
}

export interface ProbeResult {
  ok: boolean;
  status: number;
  size: number;
  bytes: number;
  ms: number;
  message: string;
}

export interface IpcResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  url?: string;
}
