/**
 * Konfigurimi i mjedisit për CRM.
 * Vite ekspozon vetëm variablat me prefix VITE_.
 *
 * Këtu NUK ka më default p.sh. http://localhost:5000,
 * ndaj VITE_API_URL në `.env` duhet patjetër të jetë i vendosur.
 */

const API_URL = import.meta.env.VITE_API_URL;

export const env = {
  /** Baza e URL-it të API (pa /api). Për thirrjet: `${env.apiUrl}/api/...` */
  apiUrl: (API_URL ?? '').replace(/\/$/, ''),
} as const;
