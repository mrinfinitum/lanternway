# @lanternway/shared

Plain TypeScript shared by the website (`apps/web`) and, later, the mobile app (`apps/mobile`): types, record validation, labels, dates and family roles.

- No React, no Node built-ins, no database code. Everything here must also run on a phone.
- No build step: apps import the source, e.g. `import { moodLabels } from "@lanternway/shared/labels"`. The website compiles it through `transpilePackages` in `apps/web/next.config.ts`.
- Import other files here with relative paths (`./types`), not `@/…`.
