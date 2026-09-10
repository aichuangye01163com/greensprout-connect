/**
 * 轻量 API 客户端：
 * - 未配置 baseURL 时自动走本地 mock 适配器（当前原型模式）
 * - 请求/响应拦截器预留，便于接入真实后端、微信小程序 wx.request 或 Capacitor 原生壳
 */

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  getAuthToken: () => string | null;
  /** 请求发送器：Web 用 fetch，小程序可替换为 wx.request 适配器 */
  transport: Transport;
}

export interface ApiRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export type Transport = (req: ApiRequest, config: ApiConfig) => Promise<unknown>;

/** 本地 mock 传输层：由 mock-db 注册处理器，无需任何外部服务 */
type MockHandler = (req: ApiRequest) => Promise<unknown> | unknown;
const mockHandlers: { pattern: RegExp; method: ApiRequest["method"]; handler: MockHandler }[] = [];

export function registerMockRoute(
  method: ApiRequest["method"],
  pattern: RegExp,
  handler: MockHandler,
) {
  mockHandlers.push({ method, pattern, handler });
}

export const mockTransport: Transport = async (req) => {
  const match = mockHandlers.find((h) => h.method === req.method && h.pattern.test(req.path));
  if (!match) throw new ApiError(404, `未实现的接口: ${req.method} ${req.path}`);
  await new Promise((r) => setTimeout(r, 120));
  return match.handler(req);
};

export const fetchTransport: Transport = async (req, config) => {
  const url = new URL(config.baseURL.replace(/\/$/, "") + req.path);
  Object.entries(req.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });

  const token = config.getAuthToken();
  const res = await fetch(url.toString(), {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...req.headers,
    },
    ...(req.body === undefined ? {} : { body: JSON.stringify(req.body) }),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const envBaseURL =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_API_BASE_URL"]) || "";

let config: ApiConfig = {
  baseURL: envBaseURL,
  timeout: 10000,
  getAuthToken: () => null,
  transport: envBaseURL ? fetchTransport : mockTransport,
};

export function configureApi(patch: Partial<ApiConfig>) {
  config = { ...config, ...patch };
}

export function getApiConfig() {
  return config;
}

export async function request<T>(req: ApiRequest): Promise<T> {
  return (await config.transport(req, config)) as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    request<T>({ method: "GET", path, query }),
  post: <T>(path: string, body?: unknown) => request<T>({ method: "POST", path, body }),
  patch: <T>(path: string, body?: unknown) => request<T>({ method: "PATCH", path, body }),
  delete: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    request<T>({ method: "DELETE", path, query }),
};
