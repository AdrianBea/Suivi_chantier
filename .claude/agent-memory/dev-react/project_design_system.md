---
name: project-design-system
description: Neumorphism design system for the frontend — CSS token architecture and how colors/theme are wired
metadata:
  type: project
---

Full visual redesign landed 2026-07-31: app renamed "Suivi chantier" → "Le Point Travaux"
(user-visible strings only — `package.json` name and the `suivi_chantier` DB placeholder in
`parametres/page.tsx` were left untouched, they're not product-facing). Styling migrated from a
hardcoded dark palette to a neumorphic (soft UI) system with light + dark variants.

**Why:** The whole frontend uses inline `style={{}}` objects almost exclusively — no Tailwind
color classes, no CSS modules. Colors were literal hex values repeated hundreds of times. Rather
than hand-edit every occurrence, all hexes were mapped to semantic CSS custom properties
(`--nm-*`) defined once in `src/app/globals.css`, then substituted in place across every
`.tsx` file with a one-off Node script (mapping preserved in this memory's history, not in repo).

**How to apply:**
- Never hardcode a hex color in a new component. Use the existing `--nm-*` tokens from
  `globals.css` (`--nm-base`, `--nm-base-raised`, `--nm-base-sunken`, `--nm-text-primary/secondary/tertiary/muted/faint/disabled`,
  `--nm-accent` + `-hover`/`-soft-bg`/`-soft-text`, `--nm-success/warning/danger/info` + `-bg` variants,
  `--nm-border`/`-strong`, `--nm-shadow-raised`/`-raised-sm`/`-pressed`/`-pressed-sm`, `--nm-radius-sm/md/lg/pill`).
- Dark mode is `.dark` class OR `prefers-color-scheme: dark` media query (both defined, kept in
  sync manually — no dark-mode toggle UI exists yet, it's system-preference only).
- Shared neumorphic utility classes exist in `globals.css`: `.nm-card`, `.nm-inset`, `.nm-btn`,
  `.nm-btn-primary`, `.nm-input`, `.pressable`. Prefer these over hand-rolled shadow strings.
- Global CSS rules already give every `button`/`a`/`[role=button]` a pointer cursor and a
  scale(0.97) press animation on `:active` — don't re-add `cursor: pointer` unless overriding.
- `prefers-reduced-motion: reduce` is handled globally (kills all transitions/animations,
  neutralizes `.parallax-layer` transforms) — any new animation should rely on this existing
  rule rather than adding a bespoke media query.
- Parallax: `src/lib/useParallax.ts` is a small hook (translateY on scroll, capped, passive,
  respects reduced-motion) applied to `ListPageHeader` and the dashboard hero. Reuse it for any
  new page header rather than writing a new scroll listener.
- `TYPE_LOT_COLORS` in `lib/types.ts` was deliberately left as raw hex (not tokenized) — it's a
  fixed categorical palette for lot-type badges, independent of light/dark theme by design.
- Known pre-existing issue, unrelated to this redesign: `npm run build` (static export) fails on
  `/import` — `useSearchParams()` needs a Suspense boundary. Confirmed present on `main` before
  any of these changes too. `npm run dev` works fine; don't attribute this to the design system.
