# FeedTLDR Design System

The single source of truth for how the new frontend looks, moves, and reads. Every UI task starts by reading this file. The visual direction is locked from the existing brand mocks (cream landing page, "Today's Feed" summary, left settings sheet), not invented per-task.

**Design read:** consumer SaaS (product app + marketing site) for a personal AI newsletter tool, warm editorial-minimal language locked from existing brand mocks, built on Next.js + Tailwind v4 + shadcn/ui with Poppins and a cream/ink palette.

**Dials** (design-taste-frontend): `DESIGN_VARIANCE: 6` (marketing) / `4` (app surfaces) · `MOTION_INTENSITY: 4` · `VISUAL_DENSITY: 3`.

Deliberate overrides of skill defaults, justified by the existing brand:

- **Warm cream palette** is normally a banned AI-default for consumer briefs; here it is the established brand from the mocks, so it stays.
- **Pill buttons** are normally discouraged in minimalist protocol; the mocks use fully-rounded pills for every button, so pills are the locked shape rule for interactive elements (see Shape system).
- **Light-only v1.** The brand mock is a warm-paper light theme. Tokens are structured semantically so a dark theme can be added later, but v1 ships light-locked (Page Theme Lock). Revisit after cutover.

---

## 1. Brand foundations

- **Voice:** plain, calm, specific. "Stay informed without the overwhelm." No AI cliches (elevate, seamless, unleash, next-gen). Sentence case everywhere including buttons ("Try now", "Re-generate", "Play summary"). No emojis in UI. No em-dashes anywhere in UI copy; use periods or commas.
- **Illustration:** monochrome hand-drawn line art (the bear mascot sipping a feed-cube drink, sparkles). Assets live in `apps/web/public/brand/`. Port `feed_logo.png` + `landing_image_mascot.png` from the old repo; re-export as SVG where possible. Sparkle glyphs are decorative SVG accents used sparingly (max 2–3 per page, marketing pages only).
- **Logo:** bubble wordmark "Feed." + plain-text "TLDR" suffix. Never restyle the wordmark; scale it as a unit.

## 2. Color tokens

Warm monochrome + ink, with white cards on cream. Color is scarce: the accent pastels appear only in small semantic touches (chips, avatar, focus tints), never as section backgrounds.

| Token | Hex | OKLCH | Use |
| --- | --- | --- | --- |
| `--background` | `#F7F5EF` | `oklch(0.97 0.009 95)` | Page canvas (warm bone) |
| `--card` | `#FFFFFF` | `oklch(1 0 0)` | Cards, sheet panels, inputs on cream |
| `--foreground` | `#1C1B18` | `oklch(0.22 0.004 95)` | Headings, primary text (never #000) |
| `--muted-foreground` | `#6E6A60` | `oklch(0.52 0.014 95)` | Secondary text, timestamps, helper text |
| `--border` | `#E8E5DC` | `oklch(0.92 0.009 95)` | Hairlines, card borders, dividers |
| `--primary` | `#1C1B18` | — | Filled pill buttons (ink on cream) |
| `--primary-foreground` | `#FFFFFF` | — | Text on primary |
| `--accent` | `#ADBCE6` | `oklch(0.79 0.055 270)` | Avatar bg, selected states, small highlights |
| `--link` | `#3D6FA8` | `oklch(0.53 0.09 255)` | Links. The mock's lighter blue (`#5B9BD5`) fails 4.5:1 on cream; this keeps the hue at AA. Hover may lighten toward the mock blue. |
| `--destructive` | `#9F2F2D` | — | Destructive actions, error text |

Semantic pastels (chips/badges only, per minimalist-ui): pale green `#EDF3EC`/text `#346538` (verified), pale red `#FDEBEC`/text `#9F2F2D` (failed/not found), pale yellow `#FBF3DB`/text `#956400` (pending/unverified), pale blue `#E1F3FE`/text `#1F6C9F` (info).

`--primary-hover` (`#333330`) is the one hover shade for filled ink buttons.

Rules: one accent family per page (Color Consistency Lock). No gradients, no colored section backgrounds, no glow shadows. Backgrounds may carry a barely-there radial warmth (`radial-gradient`, opacity ≤ 0.03) on marketing pages only.

Implementation: declared once in `:root` in **OKLCH** (the format shadcn prescribes), then mapped to the shadcn/ui semantic names via Tailwind v4 `@theme inline`. Components use the generated utilities (`bg-pastel-green`), never the raw variable. Never hard-code a colour in a component — `pnpm check:tokens` fails the build if you do (docs/ENGINEERING.md §3.1).

## 3. Typography

- **Family:** Poppins (matches the mocks' geometric sans) via `next/font/google`, weights 400/500/600. Fallback: `system-ui, "Segoe UI", sans-serif`. Mono (kbd, code, metadata): `Geist Mono` or `JetBrains Mono`. No serif anywhere.
- **Root:** `antialiased` on the root layout. `text-wrap: balance` on headings, `text-wrap: pretty` on descriptions.

Size, line-height, tracking and weight travel together as one token, so a heading is never assembled from three utilities. The scale is fluid: `clamp()` replaces `sm:`/`lg:` size jumps.

| Token | Spec | Use |
| --- | --- | --- |
| `text-display-xl` | clamp 48–68px / 1.05 / 600 / -0.02em | Landing hero ("Stay Informed…") |
| `text-display-lg` | clamp 36–48px / 1.1 / 600 / -0.02em | Page titles ("Today's Feed", "Pricing") |
| `text-heading` | clamp 30–36px / 1.15 / 600 / -0.01em | Marketing section headings, sub-page titles |
| `text-title` | 24px / 1.2 / 600 | Card titles, dialog titles |
| `text-section` | 18px / 1.3 / 600 | Feed section headlines, gallery sections |
| `body` (default) | 16px / 1.6 / 400 | Default UI + summary prose |
| `text-sm` | 14px / 1.5 / 400 | Helper text, meta |
| `text-xs` | 12px / 1.4 | Labels, chips (sentence case, not all-caps) |

Rules: summary prose capped at `max-w-prose` (65ch, `--container-prose`). Timestamps, credit counts, and prices use `tabular-nums`. Inputs are ≥16px on mobile (`text-base sm:text-sm`) to prevent iOS zoom. Headings ≤ 2 lines in heroes. Body text never lighter than weight 400. Use `text-balance` / `text-pretty`, never an inline `textWrap` style.

## 4. Shape, borders, elevation

**Shape system (locked, documented per the Shape Consistency Lock):**

- Interactive pills: buttons, chips, toggles, audio pill, badge = `rounded-full`
- Containers: cards, sheet, dialogs, chat bubbles = `rounded-card` (24px, `--radius-card`)
- Inputs, textareas, popovers, kbd: `rounded-field` (12px, `--radius-field`)
- Nested surfaces follow concentric radius: outer = inner + padding

**Borders & elevation:** flat by default. Cards are `bg-card` with `border border-border` (1px) and no shadow, sitting on the cream canvas. Elevation is two tokens and nothing else:

- `shadow-overlay` — sheet, dialog, dropdown, select, tooltip
- `shadow-lift` — hover-lift on interactive cards, active tab pill

Tailwind's default `shadow-xs/sm/md/lg/xl` are banned and fail `pnpm check:tokens`. Dividers inside content (feed sections) are 1px `--border` hairlines; between unrelated groups prefer whitespace over lines (gap between groups ≥ 2× gap within).

## 5. Spacing & layout

- Spacing scale: Tailwind default (4px base). Section rhythm on marketing pages: `py-24`–`py-32`. App pages: `py-10`–`py-16`.
- Content containers: marketing `max-w-6xl`, app content column `max-w-3xl` (the mock's summary is a single centered column), settings sheet `max-w-sheet` (520px, `--container-sheet`), prose `max-w-prose`.
- Layout margins: ≥16px inline on mobile; controls never touch viewport edges; media may bleed.
- Alignment: left-aligned headers and content (the mocks are left-aligned; avoid centered hero stacks). Landing hero is a split layout: text left, mascot right, collapsing to single column under `md`.
- Progressive disclosure: anything scrollable shows a peeking next item (16–32px) or a disclosure control.
- Logical properties (`ps-*`, `me-*`) over physical left/right.

## 6. Motion

Quiet and functional. Easing is one token, `ease-brand` (`cubic-bezier(0.16, 1, 0.3, 1)`); durations 150–300ms (600ms only for scroll-entry on marketing pages).

- Press: the `press` utility on buttons/chips/toggles (`--press-scale`, exactly 0.96). Never hand-write the scale.
- Hover: color/opacity shifts ≤200ms; interactive cards may lift per §4.
- Enter/exit: sheet slides from left 300ms; dialog fade+scale from 0.98; exits softer than enters, small fixed `translateY`, `ease-out`.
- Staggered reveals: marketing sections and feed sections fade in `translateY(12px)`, 80ms stagger, `IntersectionObserver` or Motion `whileInView`, `viewport={{ once: true }}`.
- Icon state changes cross-fade (opacity 0→1, scale 0.25→1, blur 4px→0), spring `duration 0.3, bounce 0`.
- Generation progress: the stage list animates state changes; no infinite loops besides the active-stage indicator and audio-playing state.
- Restraint: no custom animation on high-frequency interactions; every animated state change also has a static cue. All motion honors `prefers-reduced-motion` (collapse to instant). No `window.addEventListener('scroll')`; no marquees; max one decorative animation per page.

## 7. Iconography

**Phosphor Icons** (`@phosphor-icons/react`), regular weight, one family only (replace shadcn's default lucide imports when generating components). Stroke presence matches text weight (1.5px beside 400 text, bolder beside 600). Icons use `currentColor`; states via CSS color/opacity, never separate assets. Outline = default, Fill = active. Decorative sparkles are brand SVG assets, not icon-font glyphs.

## 8. Component inventory

Base primitives via `npx shadcn@latest add`, then restyled through tokens (never ship default shadcn state). Custom composites live in `components/feedtldr/` and are built from the primitives.

| Component | Base | Notes |
| --- | --- | --- |
| `Button` | shadcn button + CVA | Variants: `primary` (ink pill), `outline` (1px border pill), `ghost`, `icon` (circular). Sizes sm/md/lg. Press scale 0.96 |
| `AppBar` | custom | App pages: settings icon-button left; Re-generate primary + Avatar right (mock 2) |
| `MarketingNav` | custom | Logo left; Pricing + "Go to summary" outline pill right; ≤72px tall, one line |
| `Footer` | custom | Copyright + legal links |
| `Card` | shadcn card | 24px radius, border, no shadow |
| `Sheet` | shadcn sheet | Settings panel, `side="left"`, white on cream, overlay scrim `rgba(28,27,24,0.45)` |
| `Dialog` | shadcn dialog | Generate options, confirmations |
| `Input`, `Textarea`, `Select` | shadcn | 12px radius, cream fill on white cards, visible focus ring |
| `Field` | shadcn field | Label + control + description + error. Every form field uses it; no hand-rolled `grid gap-2` |
| `Table` | shadcn table | Source-data rows |
| `ToggleGroup` | shadcn toggle-group | Segmented pills (billing interval) |
| `TagInput` | custom (Input + Badge) | X-account chips: type, Enter to add, X to remove, paste-splits on commas |
| `AccountsField` | custom | TagInput + plan-limit notice, plus `VerifyAccountsButton` and `ImportAccountsDialog`. Shared by the settings sheet and onboarding |
| `AccountChip` | Badge | Handle + verification state (pastel semantics §2) |
| `Notice` | custom | Inline message block, tones info/warning/success/error, filled or plain. The only pastel surface |
| `Spinner` | custom | The one busy indicator; `label` when it stands alone |
| `PageHeader` | custom | Title + description + supporting controls, at `text-display-lg` |
| `EmailChipList` | custom | Newsletter recipient(s); remove-to-unsubscribe with confirm |
| `FeedSection` | custom | Headline + body + links list; hairline-separated (mock 2) |
| `SummaryProse` | custom | Sanitized `summary_html` renderer, prose styles, `max-w-[65ch]`, links per §2 |
| `AudioPill` | custom | "Play summary" outline pill wrapping `<audio>`: play/pause, progress, time `tabular-nums` |
| `GenerationProgress` | custom | Stage list (collect → summarize → audio → email) driven by `pipeline_status` polling; skeleton-first |
| `CreditBadge` | custom | Cost + remaining credits, `tabular-nums` |
| `Avatar` | shadcn avatar | Initials on `--accent` lavender |
| `Tabs` | shadcn tabs | Summary / Source data |
| `DataTable` | TanStack Table + shadcn | Source-data explorer: sort, search |
| `StatCard` | custom | Posts/likes/views metrics |
| `FeedCharts` | Recharts via `lib/chart-theme.ts` | Posts per account, engagement, timeline. Recharts cannot read classes, so `chart-theme` is the one place a chart names a `var(--token)` |
| `ThemePicker` | Select/pills | Summary theme presets (General/ML/Politics/Finance) + custom prompt textarea |
| `OnboardingSteps` | custom | 3-step wizard progress trail |
| `PlanCard` | custom | Plan tier + features + the one action that plan offers (`planAction` owns that rule) |
| `UsageSummary` | custom | Credit meter + period counters |
| `EmptyState` | custom | Composed empty states w/ mascot + one CTA |
| `Skeleton` | shadcn skeleton | Shape-matched loading (no spinners) |
| `Toast` | sonner | Transient feedback only; errors inline where they occur |
| `Kbd` | custom | Keystroke hints, mono font |

Every component ships with: hover, focus-visible, active, disabled, loading, and (where relevant) empty + error states. The `/design` route renders the full inventory in all states as a living gallery for review and visual regression.

## 9. Page specs

- **Landing `/`** — MarketingNav; split hero (display-xl left, mascot right); "Try now" primary pill + supporting blurb (≤20 words); below the fold: 2–3 sections (how it works, sample summary teaser from demo data, email capture CTA); footer. Max 4 text elements in hero. Distinct layout families per section; no three-equal-card rows.
- **Feed `/app`** — AppBar; "Today's Feed" display-lg; "Generated on …" muted with user-timezone formatting; AudioPill; hairline-separated FeedSections; Tabs to Source data (StatCards + Charts + DataTable). States: demo (no generations yet: banner + demo summary), generating (GenerationProgress replaces stale summary CTA area), error (inline with retry), empty-scrape (explain + link to settings).
- **Settings sheet** (over `/app`) — three white cards per mock 3: Accounts (TagInput + verify + import-followees popover), Newsletter email (EmailChipList + subscribe), AI prompt (ThemePicker + textarea); timezone select; Re-generate primary at bottom. Inline validation below fields; plan-limit notices with upgrade link.
- **Generate dialog** — fetch-latest toggle vs re-summarize, theme/prompt, CreditBadge cost preview, Generate primary; disabled states explain why (no accounts / none verified / insufficient credits).
- **Auth `/login` `/signup`** — single centered card on cream, logo, email+password + Google button, plain error copy; password requirements as helper list.
- **Onboarding `/onboarding`** — 3 steps (add accounts → verify → newsletter email), OnboardingSteps progress, skippable where safe.
- **Chat `/app/chat`** — message list + composer, credits per message noted, feed-context indicator, clear-chat.
- **Pricing `/pricing`** — PricingCards from plan config; current plan + usage meters for signed-in users; checkout/portal via API.
- **Profile** (menu from Avatar) — name edit, plan + credits, manage subscription (portal), logout, delete account (typed confirmation dialog).
- **Legal** `/terms`, `/privacy`, `/imprint`, `/about`, `/contact` — prose pages, `max-w-[65ch]`.

## 10. Accessibility baseline

Focus-visible rings on every interactive element via the `focus-ring` utility (`--ring-width` at `--ring-opacity` of `--ring`) — one definition, never re-stated per component. Hit areas ≥40px. Labels above inputs, errors below, no placeholder-as-label. Landmarks + skip link in app shell. Sheet/dialog trap focus and restore on close. Audio player fully keyboard-operable. Contrast: all text AA minimum (this is why `--link` is darker than the mock; verify chips' pastel text pairs). `prefers-reduced-motion` respected globally. Charts get text alternatives (StatCards carry the numbers).

## 11. Anti-slop checklist (pre-merge, every UI PR)

1. `pnpm check:tokens` clean: no raw colour, no arbitrary value carrying a measurement, no Tailwind default shadow, no static inline style. No default shadcn styling, no gradients.
2. Shape system respected (`rounded-full` / `rounded-card` / `rounded-field`, concentric nesting), type from the scale tokens, `focus-ring` and `press` rather than hand-written states.
3. All interactive states implemented; skeletons match final layout.
4. Copy: sentence case, plain language, no em-dashes, no emojis, no AI cliches; re-read every visible string.
5. Max one decorative flourish per page; motion motivated and reduced-motion safe.
6. One icon family (Phosphor); no hand-rolled icon paths.
7. Mobile: single-column collapse, 16px input text, layout margins, no horizontal scroll.
8. `pnpm lint && pnpm typecheck && pnpm check:tokens` clean; `/design` gallery updated for new/changed components.
9. Screenshot the change against the mocks; run `/better-interface quick` on touched screens before release milestones.
