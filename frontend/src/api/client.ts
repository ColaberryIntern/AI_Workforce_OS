/**
 * Tiny fetch wrapper that understands the backend's `{data,meta}`/`{error}` envelope.
 * Auth header is attached via getToken() so the AuthContext can rotate it freely.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'aiwos.accessToken';

export interface ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore (e.g. private mode)
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(body?.error?.message ?? `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    err.code = body?.error?.code ?? 'UNKNOWN';
    err.details = body?.error?.details;
    throw err;
  }

  return body.data as T;
}

export async function apiFetchWithMeta<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (res.status === 204) return { data: undefined as T };
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message ?? `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    err.code = body?.error?.code ?? 'UNKNOWN';
    err.details = body?.error?.details;
    throw err;
  }
  return { data: body.data as T, meta: body.meta };
}
