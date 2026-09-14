// Access token lives only in memory (never localStorage) so it can't be read by
// an injected script or persisted to disk. Losing it on a hard refresh is expected —
// bootstrapAuth() below silently exchanges the httpOnly refreshToken cookie for a
// fresh one on app start.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          setAccessToken(null);
          return null;
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken as string;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options, accessToken);

  // Access token expired mid-session — silently refresh once and retry the same call.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await rawFetch(path, options, newToken);
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Đã có lỗi xảy ra.');
  }
  return data as T;
}

/** Call once on app start: trades the httpOnly refresh cookie for an access token. */
export async function bootstrapAuth(): Promise<boolean> {
  const token = await refreshAccessToken();
  return !!token;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
