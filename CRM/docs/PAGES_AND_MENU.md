# Faqet dhe menya – admin vs client (Faza 2)

## Layout i përbashkët

Pas login-it, të gjitha faqet përdorin një layout të përbashkët:

- **Header** (top): emri i përdoruesit, role (Admin / Klient), butoni **Dil** (logout).
- **Meny anësore** (sidebar): lidhje sipas role (klienti nuk sheh "Klientët").

---

## Meny sipas role

### Admin

- **Paneli** (`/`) – pamje e përgjithshme.
- **Klientët** (`/klientet`) – lista e të gjithë klientëve (përdoruesve).
- **Inbox** (`/inbox`) – të gjitha bisedat ose sipas klientit (kur implementohet).
- **Kanale** (`/channels`) – kur hyn te një klient (ose kanalet e veta).
- **Automatikë** (`/automation`) – rregulla automation për kanalin.
- **Cilësime** (`/settings`) – cilësime për atë klient / kanal.
- **Chatbot ON/OFF** (`/chatbot`).
- **Përgjigje manuale** (`/manual-reply`) – për atë klient.

Asnjë link "Të gjithë përdoruesit" për klientin – vetëm admin sheh **Klientët**.

### Client

- **Paneli** (`/`) – përmbledhje e vet.
- **Profili im** (`/profile`) – emër, companyInfo.
- **Kanale** (`/channels`) – kanalet e mia (përfshirë Connect Instagram kur implementohet).
- **Inbox** (`/inbox`).
- **Automatikë** (`/automation`) – keyword → reply.
- **Cilësime** (`/settings`) – ndryshim përgjigjet e chatbotit.
- **Chatbot ON/OFF** (`/chatbot`).

Klienti **nuk** sheh asnjëherë "Klientët" apo "Të gjithë përdoruesit".

---

## Faqe vetëm për admin

| Path        | Përshkrim |
|-------------|-----------|
| `/klientet` | Lista e klientëve. API: `GET /api/users`. |
| `/manual-reply` | Përgjigje manuale (kur hyn te një klient). |

"Hyj si klient X" (impersonation) do të shtohet më vonë.

---

## Faqe për klient (dhe admin në kontekst klienti)

| Path        | Përshkrim |
|-------------|-----------|
| `/`         | Paneli – përmbledhje. |
| `/profile`  | Profili im. API: `GET/PATCH /api/auth/me`. |
| `/channels` | Kanale (Connect Instagram, etj.). API: `/api/channels`. |
| `/inbox`    | Bisedat dhe mesazhet. |
| `/automation` | Rregulla automation, keyword → reply. |
| `/settings` | Cilësime, përgjigje chatbot. |
| `/chatbot`  | Chatbot ON/OFF. |
