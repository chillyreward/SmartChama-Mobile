# Integrations

Screens never call third-party SDKs directly. They use the interfaces in
`src/integrations/types.ts`, and `src/integrations/index.ts` decides which
implementation backs each one. Today most slots hold a no-op that is safe to
call; adding a provider means writing one file and changing one line.

| Slot | Active now | Plug in later | Notes |
|---|---|---|---|
| `crashReporting` | none | Sentry (`@sentry/react-native`) or Firebase Crashlytics | Report the opaque user id only. Update the Play Data safety form. |
| `analytics` | none | Firebase Analytics, PostHog | Starts with consent **off**; add a consent toggle in Profile first (Kenya Data Protection Act). |
| `push` | Expo push (FCM) | – | Token saved to `profiles.push_token`; web sends via `src/lib/push-notifications.ts`. |
| `appIntegrity` | none | Google Play Integrity API | Server issues a nonce, app returns a token, the **server** verifies it with Google before high-risk actions (payments, withdrawals). |
| `appUpdates` | EAS Update (OTA JS fixes) | + Play in-app updates for native releases | OTA updates apply on next launch, never mid-payment. |
| `mobileMoney.mpesa` | M-Pesa via web API | – | Server holds Daraja credentials and verifies results. |
| `mobileMoney.airtel_money`, `.card` | unavailable | Airtel Money, card gateway | Needs matching server routes; the app UI can list providers where `enabled` is true. |
| `identity` | none | Smile ID, licensed IPRS partner | Verify national ID during onboarding; store only the result server-side. |
| `ai` | none | web `/api/chat` | Turn on with `EXPO_PUBLIC_FEATURE_AI_ASSISTANT=true` once implemented. |

## Adding a provider (example: Sentry)

1. `npx expo install @sentry/react-native` and add its config plugin to `app.json`.
2. Create `src/integrations/sentry.ts` implementing `CrashReporting`.
3. In `src/integrations/index.ts`, replace `noopCrashReporting` with it.
4. Put the DSN in `eas.json` as `EXPO_PUBLIC_SENTRY_DSN` (DSNs are public).
5. Update the Data safety form (crash logs, diagnostics).

## Other planned slots

- **Encrypted offline cache:** `src/lib/queryClient.ts` persists only queries marked
  `meta: { persist: true }`. To cache balances offline, add an encrypted storage
  (for example, an AES key held in SecureStore encrypting AsyncStorage values) and persist through it.
- **Certificate pinning:** after the API and Supabase domains are final, pin through a
  native network config (requires a config plugin; plan key rotation first).
- **Feature flags from a server:** `src/config/features.ts` reads build-time flags; a
  remote-config provider can be layered on top later.
