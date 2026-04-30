/**
 * Consistent API response envelopes. Build Guide §7 — every response uses
 * this shape so clients can parse generically.
 */

export interface SuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, meta?: Record<string, unknown>): SuccessEnvelope<T> {
  return meta ? { data, meta } : { data };
}

export function fail(code: string, message: string, details?: unknown): ErrorEnvelope {
  const err: ErrorEnvelope = { error: { code, message } };
  if (details !== undefined) err.error.details = details;
  return err;
}
