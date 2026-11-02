# Lanternway

Your child's whole journey, in one place. See `PRD.md` (product), `BUILD_PLAN.md` (tasks), and `CLAUDE.md` (rules for contributors and agents).

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint
pnpm typecheck
```

## Where things live

- `apps/web/` — the Next.js website
- `packages/shared/src/types.ts` — data types (shared with the future mobile app)
- `apps/web/src/lib/data.ts` — data access (screens use this)
- `apps/web/src/mock/` — fictional sample data for Maya (generated from fixed seeds)
- `apps/web/src/lib/brand.ts` — brand image paths and colors
- `public/brand/` — brand images
