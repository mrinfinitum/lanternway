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

- `src/lib/types.ts` — data types
- `src/lib/data.ts` — data access (screens use this; Supabase replaces it in Stage 2)
- `src/mock/` — fictional sample data for Maya (generated from fixed seeds)
- `src/lib/brand.ts` — brand image paths and colors
- `public/brand/` — brand images
