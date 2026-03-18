/**
 * Klienti API – URL bazë dhe dërgimi i JWT në header për rrugët e mbrojtura.
 * Implementuar me `axios` për thirrjet e autentifikuara dhe `fetch` aty ku ka kuptim.
 */

import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
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

/** Instance globale e axios me baseURL dhe header-at default. */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/** 401 → fshirja e tokenit dhe ridrejtimi te Login. */
function handleUnauthorized(): never {
  clearStoredAuth();
  window.location.replace('/login');
  throw new Error('Session e skaduar. Ju ridrejtoheni te faqja e hyrjes.');
}

function extractValidationMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const anyData = data as { message?: string; errors?: Record<string, string[] | string> };
  if (anyData.errors && typeof anyData.errors === 'object') {
    const firstKey = Object.keys(anyData.errors)[0];
    const firstVal = firstKey ? anyData.errors[firstKey] : undefined;
    if (Array.isArray(firstVal) && firstVal.length > 0) return firstVal[0];
    if (typeof firstVal === 'string') return firstVal;
  }
  if (typeof anyData.message === 'string') return anyData.message;
  return null;
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
  // Përputhje me përdorimet ekzistuese të apiRequest (që dërgojnë JSON.stringify në body).
  let data: unknown;
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    } else {
      data = options.body;
    }
  }

  const config: AxiosRequestConfig = {
    url,
    method: (options.method ?? 'GET') as AxiosRequestConfig['method'],
    data,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  };

  try {
    const res = await apiClient.request<ApiResponse<T> | unknown>(config);
    const body = res.data;

    if (res.status === 401) {
      handleUnauthorized();
    }

    if (
      res.status >= 200 &&
      res.status < 300 &&
      typeof body === 'object' &&
      body !== null &&
      'success' in body &&
      (body as ApiResponse<T>).success === true
    ) {
      const success = body as ApiSuccess<T>;
      return success.data;
    }

    const errMsg =
      (typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof (body as ApiError).message === 'string' &&
        (body as ApiError).message) ||
      (res.status === 403
        ? 'Nuk keni qasje.'
        : res.status === 404
          ? 'Nuk u gjet.'
          : res.status >= 500
            ? 'Gabim në server. Provoni përsëri më vonë.'
            : (res.statusText || 'Gabim në server.'));

    throw new Error(errMsg);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 401) {
        handleUnauthorized();
      }
      if (error.response.status === 422) {
        const msg = extractValidationMessage(error.response.data) ?? 'Të dhënat e futura nuk janë të vlefshme.';
        throw new Error(msg);
      }
      const msg =
        extractValidationMessage(error.response.data) ??
        (error.response.statusText || 'Gabim në server. Provoni përsëri më vonë.');
      throw new Error(msg);
    }
    throw new Error('Gabim në komunikim me serverin. Kontrolloni lidhjen dhe provoni përsëri.');
  }
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
  try {
    const res = await apiClient.request<AuthResponse | ApiError>({
      url,
      method,
      data: body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const raw = res.data;

    if (typeof raw === 'object' && raw !== null && 'success' in raw && (raw as AuthResponse).success === true) {
      const auth = raw as AuthResponse;
      return { data: auth.data as T, token: auth.token };
    }

    const msg =
      (typeof raw === 'object' &&
        raw !== null &&
        'message' in raw &&
        typeof (raw as ApiError).message === 'string' &&
        (raw as ApiError).message) ||
      'Gabim.';
    throw new Error(msg);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError<any>;
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 401) {
        const msg =
          (data && typeof data === 'object' && typeof (data as any).message === 'string' && (data as any).message) ||
          'Kredencialet janë të pasakta.';
        throw new Error(msg);
      }

      if (status === 422) {
        const msg = extractValidationMessage(data) ?? 'Të dhënat e futura nuk janë të vlefshme.';
        throw new Error(msg);
      }

      const msg =
        extractValidationMessage(data) ??
        (err.response?.statusText || 'Gabim në server. Provoni përsëri më vonë.');
      throw new Error(msg);
    }

    throw new Error('Gabim në komunikim me serverin. Kontrolloni lidhjen dhe provoni përsëri.');
  }
}
