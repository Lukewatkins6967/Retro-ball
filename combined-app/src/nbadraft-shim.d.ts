// TypeScript shim for importing your sibling draft dataset.
// Vite resolves `@/...` to the sibling `Nba draft/src/` via `vite.config.ts`.
// This file prevents TS from trying to type-check that external project.
declare module '@/lib/draft-class-2026' {
  export const TOP_2026_DRAFT_CLASS: any[];
}

