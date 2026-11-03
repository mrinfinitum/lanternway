# Lanternway for iPhone and Android

The phone app: Expo (SDK 58) with Expo Router and TypeScript. It talks only to the website's JSON API (`/api/v1`) and never to the database. See `MOBILE_PLAN.md` at the repo root for the plan and milestones.

## Run it

From the repo root, in two terminals:

```bash
pnpm dev       # the website and its API, on http://localhost:3000
pnpm mobile    # Metro; press i for the iOS Simulator, a for the Android Emulator
```

In development the app calls the API on the computer running Metro, port 3000. To point it somewhere else, for example another port or dev.lanternway.co, set `EXPO_PUBLIC_API_URL`:

```bash
EXPO_PUBLIC_API_URL=https://dev.lanternway.co pnpm mobile
```

The first run on a simulator installs Expo Go. Only libraries that Expo Go includes can be used until the app moves to a development build.

## Layout

- `src/app/`: screens (Expo Router). `_layout.tsx` loads Nunito.
- `src/theme.ts`: brand colors, fonts, radius, tap size. Use these, never raw hex.
- `src/lib/api.ts`: the API client. Typed from `@lanternway/shared/api`; bearer token from secure storage; 503 is retried, never treated as signed out.
- `src/lib/brand.ts`: every brand image, in one place.
- Shared code comes from `packages/shared` (`@lanternway/shared/...`). Keep anything both apps need there.

`pnpm lint` and `pnpm typecheck` at the repo root include this app. Use `pnpm exec expo install <package>` here (not `pnpm add`), so versions match the SDK, and ask before adding a library (`CLAUDE.md`). `AGENTS.md` here is Expo's guidance for coding agents.
