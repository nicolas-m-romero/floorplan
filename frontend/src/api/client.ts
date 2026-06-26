// frontend/src/api/client.ts
import { supabase } from '../lib/supabase';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://localhost:8000';

/**
 * When DEV_MOCK is true, API modules return hardcoded fixture data
 * instead of hitting the network. Useful when the backend is not running.
 * Set VITE_DEV_MOCK=true in .env.local to enable.
 */
export const DEV_MOCK = import.meta.env.VITE_DEV_MOCK === 'true';

export class APIError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as {
      error?: { code?: string; message?: string };
    };
    throw new APIError(
      res.status,
      err?.error?.code ?? 'UNKNOWN',
      err?.error?.message ?? `HTTP ${res.status}`,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/** Multipart upload — does not set Content-Type (browser sets boundary) */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as {
      error?: { code?: string; message?: string };
    };
    throw new APIError(
      res.status,
      err?.error?.code ?? 'UNKNOWN',
      err?.error?.message ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}
