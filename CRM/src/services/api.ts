/**
 * Klienti API – URL bazë dhe dërgimi i JWT në header për rrugët e mbrojtura.
 */

import { env } from '../config/env';

const STORAGE_KEY_TOKEN = 'crm_token';
const STORAGE_KEY_USER = 'crm_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: StoredUser): void {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  token?: string;
}

export interface ApiError {
  success: false;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** 401 → fshirja e tokenit dhe ridrejtimi te Login. */
function handleUnauthorized(): never {
  clearStoredAuth();
  window.location.replace('/login');
  throw new Error('Session e skaduar. Ju ridrejtoheni te faqja e hyrjes.');
}

/**
 * Bën një kërkesë te API. Shton Authorization: Bearer <token> nëse ka token.
 * 401 → fshin tokenin dhe ridrejton te Login. 403 → "Nuk keni qasje." 404/500 → mesazh i qartë.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiSuccess<T>['data']> {
  const url = path.startsWith('http') ? path : `${env.apiUrl}${path}`;
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const body = (await res.json().catch(() => ({}))) as ApiResponse<T> | unknown;

  if (res.status === 401) {
    handleUnauthorized();
  }

  if (res.ok && typeof body === 'object' && body !== null && 'success' in body && (body as ApiResponse<T>).success === true) {
    const success = body as ApiSuccess<T>;
    return success.data;
  }

  const errMsg =
    typeof body === 'object' && body !== null && 'message' in body && typeof (body as ApiError).message === 'string'
      ? (body as ApiError).message
      : res.status === 403
        ? 'Nuk keni qasje.'
        : res.status === 404
          ? 'Nuk u gjet.'
          : res.status >= 500
            ? 'Gabim në server. Provoni përsëri më vonë.'
            : res.statusText || 'Gabim në server.';
  throw new Error(errMsg);
}

/**
 * Për login/register ku përgjigja përmban edhe token.
 */
export interface AuthResponse {
  success: true;
  data: StoredUser;
  token: string;
}

export async function apiAuthRequest<T = AuthResponse['data']>(
  path: string,
  body: unknown,
  method: 'POST' = 'POST'
): Promise<{ data: T; token: string }> {
  const url = path.startsWith('http') ? path : `${env.apiUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = (await res.json().catch(() => ({}))) as AuthResponse | ApiError | unknown;
  if (!res.ok) {
    const msg =
      typeof raw === 'object' && raw !== null && 'message' in raw && typeof (raw as ApiError).message === 'string'
        ? (raw as ApiError).message
        : res.statusText || 'Gabim.';
    throw new Error(msg);
  }
  if (typeof raw === 'object' && raw !== null && 'success' in raw && (raw as AuthResponse).success === true) {
    const auth = raw as AuthResponse;
    return { data: auth.data as T, token: auth.token };
  }
  throw new Error('Përgjigje e papritur nga serveri.');
}
