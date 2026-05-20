# Step 3 — Mobile quality pass

## TypeScript

```bash
cd mobile
npm run typecheck
```

Expect: no errors (exit 0).

---

## Local dev before EAS build

1. `mobile/.env` — correct API URL for your test device (LAN IP or production with **www**).
2. Backend running; health OK: `API_URL=... npm run verify:health` (from `backend/`).
3. `npx expo start -c` — reload after env changes.

---

## EAS preview build

```bash
cd mobile
npx eas login
npm run build:android   # APK
# or
npm run build:ios       # device build
```

### Required EAS environment variable

In [expo.dev](https://expo.dev) → project → **Environment variables** (preview + production profiles):

| Name | Example |
|------|---------|
| `EXPO_PUBLIC_API_URL` | `https://www.infosensetechnologies.com/digitalhouse/backend/api` |

Rebuild after changing env (value is baked in at build time).

See also [BUILD.md](./BUILD.md) and [REAL_DEVICE_CHECKLIST.md](./REAL_DEVICE_CHECKLIST.md).

---

## Real-device QA matrix

Test on **at least one physical iPhone and one Android** (not only simulator).

### Auth & home
- [ ] Register / login / OTP
- [ ] Home feed loads; images stable (no heavy flicker)
- [ ] Bell → Notifications list; mark read
- [ ] Messages inbox + chat; keyboard + composer visible while typing

### Feed & posts
- [ ] Create post (photo/video)
- [ ] Like, comment, share post
- [ ] Post detail opens

### Matrimony (two approved profiles)
- [ ] Browse candidates
- [ ] Send interest → accept → mutual match
- [ ] Matches list; open candidate
- [ ] Request horoscope → other user shares → view horoscope
- [ ] Chat from match (if gated, only after match)

### Profile
- [ ] Edit profile; matrimony setup submit
- [ ] Profile photo / matrimony photo upload

### Admin (web, optional)
- [ ] Matrimony request detail → approve/reject **photo** buttons
- [ ] Full profile approve

---

## Known limitations (planned later)

- **Native push** — in-app + socket only; no system banners when app is closed.
- Production DB migrations — see `/PRODUCTION_READINESS.md` Step 1.

---

## Step 3 complete when

- `npm run typecheck` passes
- Preview APK/IPA installs and hits production (or staging) API
- QA matrix above checked on real devices
