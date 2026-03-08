# Konfigurimi i OAuth për Meta (Facebook / Instagram)

Për të mundësuar lidhjen e kanaleve **pa kopjim tokenash** (butoni "Lidh me Facebook / Instagram" në CRM), duhet të konfigurosh një aplikacion Meta dhe variablat e mjedisit në backend.

---

## 1. Aplikacioni Meta

1. Hyr në [Meta for Developers](https://developers.facebook.com/) dhe krijo (ose zgjidh) një aplikacion.
2. Shto produktin **Facebook Login** (nëse nuk e ke).
3. Në **Facebook Login** → **Settings**:
   - **Valid OAuth Redirect URIs:** shto URL-in e callback-it të backend-it, p.sh.:
     - Lokal: `http://localhost:5000/api/oauth/meta/callback`
     - Produksion: `https://api.domeni-yte.com/api/oauth/meta/callback`
4. Në **App Review** (opsional për testim): për testim me llogari të vetë-developerit, aplikacioni mund të funksionojë pa review. Për përdorues të tjerë duhet **App Review** për lejet `pages_show_list`, `pages_messaging`, `instagram_basic`, `instagram_manage_messages`.

---

## 2. Variablat e mjedisit (`.env`)

Në `.env` të backend-it shto (ose përditëso):

```env
# OAuth Meta – lidhje pa kopjim tokenash
META_APP_ID=xxx
META_APP_SECRET=xxx

# URL e frontend-it (ku ridrejtohet përdoruesi pas OAuth)
FRONTEND_URL=http://localhost:5173

# URL e backend-it (për redirect_uri te Meta – duhet të përputhet me Valid OAuth Redirect URIs)
BACKEND_URL=http://localhost:5000
```

- **Produksion:** vendos `FRONTEND_URL` dhe `BACKEND_URL` me domenet reale (p.sh. `https://app.domeni.com`, `https://api.domeni.com`).

---

## 3. Rrjedha e përdoruesit

1. Përdoruesi klikon "Lidh me Facebook / Instagram" në modalin "Shto kanal".
2. Ridrejtohet te Facebook për hyrje dhe autorizim.
3. Pas autorizimit, Meta ridrejton te backend: `/api/oauth/meta/callback?code=...&state=...`.
4. Backend-i shkëmben kodin për token, merr listën e faqeve dhe llogarive Instagram, ruan të dhënat në sesion dhe ridrejton përdoruesin te frontend: `/app/channels?oauth=meta&key=...`.
5. Frontend-i shfaq listën "Lidhni një faqe ose llogari Instagram"; përdoruesi zgjedh një dhe klikon "Lidh".
6. Backend-i krijon Channel me tokenin e ruajtur; përdoruesi sheh kanalin e ri në listë.

---

## 4. WhatsApp dhe Viber

- **WhatsApp:** lidhja me OAuth (pa kopjim tokenash) për WhatsApp Business API zakonisht kalon nëpër Meta Business Suite dhe kërkon konfigurim shtesë (numri i telefonit, verifikim biznesi). Për tani, WhatsApp mbetet me **shtim manual** (token dhe Phone Number ID).
- **Viber:** nuk ofron OAuth të ngjashme me Meta; përdoret **token manual** nga [Viber Partners](https://partners.viber.com/).
