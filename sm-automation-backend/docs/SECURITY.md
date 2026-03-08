# Siguria dhe ruajtja e të dhënave – rekomandime për prodhim

Ky dokument përshkruan masat e sigurisë të implementuara dhe çfarë duhet konfiguruar për prodhim.

---

## 1. Politika e privatësisë dhe GDPR

- **Politika e privatësisë** është e disponueshme në aplikacion (faqja /privacy) dhe përshkruan çfarë të dhënash mbledhim, si i përdorim dhe të drejtat tuaja (qasje, ndreqje, fshirje, portabilitet, ankim).
- **Eksporti i të dhënave (portabilitet):** përdoruesi i autentifikuar mund të kërkojë një kopje të të dhënave të tij me **GET /api/auth/me/export**. Përgjigja është JSON me profilin, kanale (pa tokena), kontakte, biseda dhe mesazhe.
- **Fshirja e llogarisë (“e drejta për të u harruar”):** **DELETE /api/auth/me** me body `{ "password": "..." }` fshin llogarinë dhe të gjitha të dhënat e lidhura (kanale, kontakte, biseda, mesazhe, rregulla, etj.). Kërkon konfirmim me fjalëkalim.

---

## 2. Ruajtja e sigurt e tokenave (Meta / Viber)

- **Tokenat e aksesit** (Channel.accessToken) për Meta dhe Viber ruhen në bazën e të dhënave.
- Nëse vendosni **TOKEN_ENCRYPTION_KEY** në `.env`, tokenat **enkriptohen në pushim** (AES-256-GCM) para ruajtjes dhe çdekriptohen vetëm kur përdoren për dërgesë mesazhesh. API-ja nuk kthen kurrë tokenin e papërpunuar (maskohet si `***`).
- **Rekomandim për prodhim:** gjeneroni një çelës të fortë 32-bajtësh (64 karaktere hex) dhe vendoseni në `.env`:
  ```env
  TOKEN_ENCRYPTION_KEY=your-64-char-hex-key-here
  ```
  Shembull gjenerimi (Node): `require('crypto').randomBytes(32).toString('hex')`
- Nëse **nuk** vendosni TOKEN_ENCRYPTION_KEY, tokenat ruhen në formë të lexueshme (përputhshmëri me instalacione ekzistuese). Për instalacione të reja në prodhim rekomandohet gjithmonë ta vendosni.

---

## 3. Fjalëkalimet dhe JWT

- Fjalëkalimet hashohen me **bcrypt** (12 raunde) dhe nuk ruhen kurrë në formë të lexueshme.
- **JWT_SECRET** duhet të jetë një string i rastësishëm dhe i fuqishëm vetëm në prodhim. Mos përdorni vlerën e parazgjedhur nga kodi.
- Komunikimi duhet të jetë **HTTPS** në prodhim, që tokeni dhe të dhënat të mos ekspozohen në tranzit.

---

## 4. Variablat e mjedisit për prodhim

| Variabël | Përshkrim |
|----------|-----------|
| **JWT_SECRET** | String i rastësishëm, i gjatë (p.sh. 32+ karaktere). Obligator për prodhim. |
| **TOKEN_ENCRYPTION_KEY** | 64 karaktere hex (32 bytes) për enkriptimin e tokenave në pushim. Rekomandohet për prodhim. |
| **MONGODB_URI** | Lidhja e sigurt me MongoDB (përdorni TLS dhe kredencialet e fuqishme). |
| **META_APP_SECRET** | Fshehur; përdoret për validimin e webhook-ave Meta. |
| **FRONTEND_URL** / **BACKEND_URL** | URL të plota HTTPS të aplikacionit. |

Mos ua ekspozoni kurrë këto vlera në depo publike ose në frontend.

---

## 5. Hosting dhe bazë e të dhënave

- Përdorni **HTTPS** për të gjithë trafikun (TLS 1.2+).
- Baza e të dhënave (MongoDB) duhet të jetë e aksesueshme vetëm nga serveri i aplikacionit (rrjet privat ose whitelist IP).
- Bëni **backup** të rregullta të bazës së të dhënave dhe testoni rikthimin.

---

## 6. Përditësimi i politikës së privatësisë

Nëse shtoni enkriptim tokenash, eksport/delete ose ndryshime të tjera në përpunimin e të dhënave, përditësoni faqen **Politika e privatësisë** (/privacy) dhe, ku është e nevojshme, njoftoni përdoruesit (email ose njoftim në aplikacion).
