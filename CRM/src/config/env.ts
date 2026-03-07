/**
 * Konfigurimi i mjedisit për CRM.
 * Vite ekspozon vetëm variablat me prefix VITE_.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export const env = {
  /** Baza e URL-it të API (pa /api). Për thirrjet: `${env.apiUrl}/api/...` */
  apiUrl: API_URL.replace(/\/$/, ''),
} as const;
