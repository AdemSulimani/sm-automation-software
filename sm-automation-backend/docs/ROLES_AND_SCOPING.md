# Role dhe fushëzimi i të dhënave (admin / client)

## Role në backend

- **User.role**: `'admin'` | `'client'`. Default për regjistrim të ri: `'client'`.
- Përdoruesit ekzistues pa fushë `role` trajtohen si `'client'` në përgjigje (përputhje me të kaluarën).
- Për të bërë një përdorues admin: përditësoni në MongoDB `db.users.updateOne({ email: '...' }, { $set: { role: 'admin' } })`, ose shtoni një skript/seed.

## Middleware

- **protect**: verifikon JWT, vendos `req.userId` dhe `req.user`. Të gjitha rrugët e mbrojtura për klientë përdorin vetëm këtë.
- **requireAdmin**: përdoret **pas** `protect`. Kontrollon `req.user.role === 'admin'`; nëse jo, kthen 403.

## Rrugët e klientit (vetëm JWT, të dhënat sipas userId)

Këto rrugë përdorin vetëm `protect`. Të dhënat kufizohen nga `req.userId`:

| Rrugë | Fushëzimi |
|-------|------------|
| `GET/PATCH /api/auth/me` | Profili i përdoruesit të loguar |
| `GET/POST/PUT/DELETE /api/channels` | Channelet ku `userId === req.userId` |
| `GET/POST/PUT/DELETE /api/automation-rules` | Rregullat për channelet e `req.userId` |
| `GET/POST/PUT/DELETE /api/keyword-responses` | Përgjigjet për channelet e `req.userId` |

Klienti nuk sheh asnjëherë të dhëna të përdoruesve të tjerë.

## Rrugët vetëm për admin

Këto përdorin `protect` + `requireAdmin`:

| Metodë | Rrugë | Përshkrim |
|--------|--------|------------|
| GET | `/api/users` | Lista e të gjithë përdoruesve (id, name, email, role, createdAt). Përdoret nga CRM për faqen "Klientët". |

Në të ardhmen: "hyj si klient X" (impersonation) do të shtohet këtu (token i veçantë ose header për kontekst klienti).

## Përgjigjet auth që përfshijnë role

- `POST /api/auth/register` dhe `POST /api/auth/login`: `data` përfshin `role` (për menynë në CRM).
- `GET /api/auth/me`: objekti `data` përfshin `role`.

CRM përdor `data.role` për të vendosur menynë (admin sheh "Klientët" / "Admin", klienti jo).
