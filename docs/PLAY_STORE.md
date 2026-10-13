# Publishing SmartChama on Google Play

Package: `co.ke.smartchama.app` · target SDK 36 (Android 16) · min SDK 24 (Android 7)

## 1. Build

| Purpose | Command | Output |
|---|---|---|
| Test APK to sideload | `npx eas-cli build -p android --profile preview` | `.apk` download link |
| Play Store release | `npx eas-cli build -p android --profile production` | `.aab` (version code auto-increments) |
| Upload to Play (internal track, draft) | `npx eas-cli submit -p android --profile production` | needs a Play service-account key |

Use **Play App Signing** (default for new apps). EAS keeps the upload key; never commit `*.jks`.

## 2. Play Console declarations

### App content → Data safety
Data is **encrypted in transit** (HTTPS only; cleartext disabled) and users **can request deletion** (in app: Profile → Delete my account; web: `https://smart-chama10.vercel.app/account/delete`).

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Name | Yes | No | Account management, app functionality | No |
| Email address | Yes | No | Account management | No |
| Phone number | Yes | With Safaricom (M-Pesa payment prompt) and SMS provider | App functionality, fraud prevention | No |
| Government ID (national ID) | Yes | No | Fraud prevention (member verification) | Yes |
| Financial info: purchase/payment history, other financial info (contributions, payouts) | Yes | No | App functionality | No |
| Photos (profile picture) | Yes, if uploaded | No | App functionality | Yes |
| In-app messages (group chat) | Yes | No | App functionality | Yes |
| App interactions / crash logs | No (until an analytics or crash integration is enabled: update this form then) | | | |
| Device or other IDs (push token) | Yes | No | App functionality (notifications) | Yes |

Location, contacts, SMS, call log, photos library and files are **not** accessed. The manifest actively removes those permissions.

### App content → other forms
- **Privacy policy:** `https://smart-chama10.vercel.app/privacy`
- **Account deletion URL:** `https://smart-chama10.vercel.app/account/delete`
- **App access:** reviewers need an account. Create a test member in a test chama and give the credentials here. Do not ship demo credentials in the app.
- **Ads:** No ads.
- **Content rating:** IARC questionnaire, category "Finance"; no user-generated public content (group chat is private to members).
- **Target audience:** 18+ only.
- **Financial features:** declare savings groups and M-Pesa payments. The app offers no borrowing or credit.
- **Government apps:** No.

### Lending
The app has no borrowing feature: members save, contribute, run merry-go-rounds and welfare funds. Answer "No" to personal lending in the Financial features declaration, so Play's Kenya Digital Credit Provider (CBK licence) requirement does not apply. If borrowing is ever added back, revisit this section before release.

The app still does not access contacts, photos, location or call logs.

## 3. Pre-launch checklist
- [ ] Web migration (`FULL_SCHEMA_MIGRATION.sql`) run on the production Supabase project
- [ ] Supabase Auth → Redirect URLs includes `smartchama://auth/callback`
- [ ] `eas.json` production env points at production Supabase + API
- [ ] Privacy policy lists everything in the Data safety table above
- [ ] Test on Android 16 and a small phone (360dp); edge-to-edge screens not clipped
- [ ] Internal testing track → closed testing (new personal developer accounts need 12+ testers for 14 days) → production
- [ ] Store listing: 512×512 icon, 1024×500 feature graphic, 2–8 phone screenshots, short and full description

## 4. Security measures in this build
- Session tokens in Android Keystore-backed `expo-secure-store` (device-only, excluded from backups); `allowBackup=false`
- OAuth uses PKCE; no tokens in redirect URLs
- No secrets in the app: only the public Supabase anon key; M-Pesa, SMS and service keys stay on the server
- Every money action is authorised server-side (session + chama role); M-Pesa results are verified with Safaricom before crediting
- Biometric / device-PIN confirmation before payments, withdrawals and account deletion; app lock after 60s in background
- Screenshots and screen recording blocked on contributions and wallet screens (FLAG_SECURE)
- Balances and statements are never written to unencrypted storage; caches cleared on sign-out
- R8 code shrinking/obfuscation and resource shrinking in release builds
- Cleartext HTTP disabled; dangerous permissions removed from the manifest
- Release builds don't log to logcat (`src/lib/logger.ts`)
