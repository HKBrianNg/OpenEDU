// client/src/dashboard/AdminConsole/types.ts

export interface HealthData {
  status: string;
  version: string;
  uptime?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface DbTestData {
  status: string;
  message?: string;
  latency?: number;
  [key: string]: unknown;
}

export interface ApiLog {
  id: string;
  time: string;
  method: string;
  url: string;
  requestHeaders: Record<string, unknown>;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
  durationMs: number;
  ip: string;
}