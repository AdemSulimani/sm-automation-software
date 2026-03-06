# Konfigurimi i Webhook-ave – Meta dhe Viber

Ky dokument përshkruan si të konfigurosh URL-et e webhook në **Meta Developer Console** (Facebook, Instagram, WhatsApp) dhe në **Viber**, si dhe si të testosh verifikimin dhe mesazhet.

---

## Parakushtet

- Backend-i duhet të jetë i deployuar me një URL publik (p.sh. `https://your-domain.com`). Meta dhe Viber duhet të mund të arrijnë këtë URL.
- Në `.env` duhet të kesh vendosur:
  - `META_WEBHOOK_VERIFY_TOKEN` – një string sekret që zgjedh vetë (p.sh. një UUID); duhet të njëjtën vlerë ta fusësh edhe në Meta.
  - `META_APP_SECRET` (opsional) – për validim të nënshkrimit të request-ave Meta.

---

## 1. Meta (Facebook Messenger, Instagram, WhatsApp)

### 1.1 URL i webhook-ut

Një URL i vetëm shërben si për **verifikim** (GET) ashtu edhe për **pranimin e eventeve** (POST):

```
https://<YOUR_DOMAIN>/api/webhooks/meta
```

Shembull: nëse domeni yt është `https://myapp.example.com`, URL-i është:

```
https://myapp.example.com/api/webhooks/meta
```

### 1.2 Konfigurimi në Meta Developer Console

1. Hyr në [Meta for Developers](https://developers.facebook.com/) dhe hap aplikacionin tënd (ose krijo një të ri).
2. Shko te **App Dashboard** → **Webhooks** (ose për WhatsApp: **WhatsApp** → **Configuration** → **Webhook**).
3. Për **Facebook** / **Instagram**: zgjidh produktin (Messenger, Instagram, etj.) dhe kliko **Add Callback URL** (ose **Configure**).
4. Fus:
   - **Callback URL:** `https://<YOUR_DOMAIN>/api/webhooks/meta`
   - **Verify Token:** e njëjta vlerë si `META_WEBHOOK_VERIFY_TOKEN` në `.env` (p.sh. `my-secret-verify-token-123`).
5. Kliko **Verify and Save**. Meta dërgon një GET në URL me `hub.mode=subscribe`, `hub.verify_token=<token>`, `hub.challenge=<challenge>`. Nëse tokeni përputhet, backend-i përgjigjet me `challenge` dhe Meta e konsideron URL-in të verifikuar.
6. Zgjidh **Subscribe to** fushat që të duhen (p.sh. `messages`, `messaging_postbacks` për Messenger).

### 1.3 Për WhatsApp

- Në **WhatsApp** → **Configuration** → **Webhook**: fus të njëjtën **Callback URL** dhe **Verify token** si më sipër, pastaj verifiko. Abono fushat e nevojshme (p.sh. mesazhe).

### 1.4 Meta App Review (opsional)

Për aplikacione publike, Meta kërkon App Review. Dokumento që përdor vetëm webhook për të pranuar mesazhe nga përdoruesit dhe për t’u përgjigjur; mos mbledh të dhëna të panevojshme. Kjo ndihmon për approval.

### 1.5 Test i verifikimit

- Me `curl` (zëvendëso domenin dhe verify token-in):

```bash
curl "https://<YOUR_DOMAIN>/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test_challenge_123"
```

Përgjigja e pritshme: `test_challenge_123` (tekst i thjeshtë, status 200). Nëse tokeni nuk përputhet, merr 403.

---

## 2. Viber

### 2.1 URL i webhook-ut

Viber dërgon vetëm POST në webhook (nuk ka verifikim GET si Meta). URL-i:

```
https://<YOUR_DOMAIN>/api/webhooks/viber
```

Shembull:

```
https://myapp.example.com/api/webhooks/viber
```

### 2.2 Konfigurimi në Viber

1. Hyr në [Viber Admin](https://partners.viber.com/) dhe hap (ose krijo) **Viber Bot** tënd.
2. Gjej seksionin **Webhook** / **Callback URL**.
3. Fus URL-in: `https://<YOUR_DOMAIN>/api/webhooks/viber`.
4. Ruaj; Viber fillon të dërgojë evente (p.sh. `conversation_started`, `message`) në këtë URL.

**Shënim:** Aksesi dhe tokenat për Viber ruhen për çdo kanal (Channel) në bazë të të dhënave; konfigurimi i webhook URL është vetëm në panelin Viber.

### 2.3 Test

- Verifikimi i Meta (GET) nuk ekziston për Viber. Për të testuar, dërgo një mesazh real tek boti nga aplikacioni Viber; backend-i duhet të marrë POST në `/api/webhooks/viber` dhe të përgjigjet sipas pipeline-it (automation / keyword / AI).

---

## 3. Përmbledhje URL-esh

| Platformë     | Metoda | URL i webhook-ut                        |
|---------------|--------|-----------------------------------------|
| Meta (FB/IG/WA) | GET    | `https://<DOMAIN>/api/webhooks/meta`   |
| Meta (FB/IG/WA) | POST   | `https://<DOMAIN>/api/webhooks/meta`   |
| Viber         | POST   | `https://<DOMAIN>/api/webhooks/viber`  |

Të dyja Meta dhe Viber përdorin të njëjtin backend pipeline (automation rule → keyword → AI) dhe outbound service për dërgesën e përgjigjeve.
