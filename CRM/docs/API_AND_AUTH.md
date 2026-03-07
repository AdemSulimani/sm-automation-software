# API dhe autentifikim – CRM

## URL i backend-it

- Në `.env` vendosni: `VITE_API_URL=http://localhost:5000` (pa slash në fund).
- Në kod përdoret `import { env } from '@/config/env'` → `env.apiUrl` (p.sh. `http://localhost:5000`).
- Thirrjet: `fetch(\`${env.apiUrl}/api/auth/login\`, ...)`.

## JWT për rrugët e mbrojtura

- Pas login/register, backend kthen `{ success: true, data: { id, name, email, role }, token }`.
- Ruajeni `token` (localStorage ose cookie) dhe dërgoni në çdo kërkesë të mbrojtur:
  - Header: `Authorization: Bearer <token>`.
- Rrugët pa token kthejnë 401. Rrugët vetëm për admin kthejnë 403 nëse `role !== 'admin'`.

## Role

- `data.role` është `'admin'` ose `'client'`.
- Përdoret për menynë: admin sheh "Klientët" / "Admin"; klienti jo.
