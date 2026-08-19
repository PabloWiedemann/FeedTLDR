# FeedTLDR Design System

The single source of truth for how the new frontend looks, moves, and reads. Every UI task starts by reading this file. The visual direction is locked from the existing brand mocks (cream landing page, "Today's Feed" summary, left settings sheet), not invented per-task.

**Design read:** consumer SaaS (product app + marketing site) for a personal AI newsletter tool, warm editorial-minimal language, built on Next.js + Tailwind v4 + shadcn/ui. Poppins body + Archivo Black display, bone canvas with a mint/forest green accent pair (2026 redesign, replacing the launch-era cream/lavender look).

**Dials** (design-taste-frontend): `DESIGN_VARIANCE: 6` (marketing) / `4` (app surfaces) · `MOTION_INTENSITY: 4` · `VISUAL_DENSITY: 3`.

Deliberate overrides of skill defaults, justified by the existing brand:

- **Warm cream palette** is normally a banned AI-default for consumer briefs; here it is the established brand from the mocks, so it stays.
- **Pill buttons** are normally discouraged in minimalist protocol; the mocks use fully-rounded pills for every button, so pills are the locked shape rule for interactive elements (see Shape system).
- **Light-only v1.** The brand mock is a warm-paper light theme. Tokens are structured semantically so a dark theme can be added later, but v1 ships light-locked (Page Theme Lock). Revisit after cutover.

---

## 1. Brand foundations

- **Voice:** plain, calm, specific. "Stay informed without the overwhelm." No AI cliches (elevate, seamless, unleash, next-gen). Sentence case everywhere including buttons ("Try now", "Re-generate", "Play summary"). No emojis in UI. No em-dashes anywhere in UI copy; use periods or commas.
- **Illustration:** monochrome hand-drawn line art (the bear mascot sipping a feed-cube drink, sparkles). Assets live in `apps/web/public/brand/`. The mascot appears only in app empty states now, not on the landing page. Sparkle glyphs are decorative SVG accents used sparingly (max 2–3 per page, marketing pages only).
- **Logo:** bubble wordmark "Feed." + plain-text "TLDR" suffix, rendered as an inline SVG (`components/feedtldr/logo.tsx`) whose fill is the `--logo` token (the ink color — the mark is never green). Never restyle the wordmark; scale it as a unit.

## 2. Color tokens

Warm bone canvas, white cards, near-black ink, and one green accent family used the Wise way: a **bright/deep pair**. Bright mint fills the primary action (with ink text; hover goes *more* vivid), deep forest carries links, focus rings, and small accents, and a soft green tint is the single hover/selection wash. Everything else stays neutral.

| Token | OKLCH | Use |
| --- | --- | --- |
| `--background` | `oklch(0.97 0.0082 91.48)` | Page canvas (warm bone, `#F7F5EF`) |
| `--card` | `oklch(1 0 0)` | Cards, sheet panels, inputs — summaries always read on pure white |
| `--foreground` | `color-mix(22% link, oklch(0.155 0.004 91.62))` | Ink: near-black cast toward the forest hue (never `#000`, never pure grey) |
| `--muted-foreground` | `oklch(0.52 0.012 140)` | Secondary text, timestamps, helper text |
| `--secondary` / `--muted` | `oklch(0.951 0.006 145)` | Washes: neutral grey with a whisper of green (link pills, icon chips) |
| `--border` / `--input` | `oklch(0.924 0.007 140)` | Hairlines, dividers, input borders |
| `--primary` | `oklch(0.86 0.13 158)` | Bright mint: filled pill buttons, ink text on top |
| `--primary-foreground` | `var(--foreground)` | Ink text on the mint fill |
| `--primary-hover` | `oklch(0.82 0.15 156)` | Hover goes more vivid, never grey |
| `--btn-border` | `color-mix(45% accent-foreground, primary)` | Darker-green outline on filled buttons |
| `--accent` | `oklch(0.935 0.04 158)` | THE hover wash + `::selection` + icon-chip fill |
| `--accent-foreground` / `--link` | `oklch(0.33 0.06 155)` | Deep forest: links, accent icons |
| `--ring` | `var(--foreground)` | Focus ring: thin crisp ink (1.5px at 100%), never a washed green halo |
| `--logo` | `var(--foreground)` | Brand mark tint — always ink, never green |
| `--destructive` | `oklch(0.4755 0.1483 25.66)` | Destructive actions, error text (`#9F2F2D`) |

Semantic pastels (chips/badges only, per minimalist-ui): pale green (verified), pale red (failed/not found), pale yellow (pending/unverified), pale blue (info) — values unchanged in `globals.css`.

Rules: one accent family per page (Color Consistency Lock) — green is that family. A deep-forest icon or glyph never sits bare on a card; it gets a soft chip behind it (`bg-secondary` neutral by default, `bg-accent` when highlighted) or it renders in ink. Hover washes are always `--accent`, never ad-hoc greys. No gradients, no colored section backgrounds, no glow shadows.

Implementation: declared once in `:root` in **OKLCH** (the format shadcn prescribes), then mapped to the shadcn/ui semantic names via Tailwind v4 `@theme inline`. Components use the generated utilities (`bg-pastel-green`), never the raw variable. Never hard-code a colour in a component — `pnpm check:tokens` fails the build if you do (docs/ENGINEERING.md §3.1).

## 3. Typography

- **Body family:** Poppins via `next/font/google`, weights 400/500/600. Fallback: `system-ui, "Segoe UI", sans-serif`. Mono (kbd, code, metadata): `JetBrains Mono`. No serif anywhere.
- **Display family:** Archivo Black (`font-display` utility) for marketing headlines only. It ships a single 400 weight; a global `.font-display { font-weight: 400 }` rule pins it so the display tokens' 600 never synthesizes a fake bolder face. App headings stay Poppins (no `font-display` class).
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

Rules: summary prose fills its card; the card's width and padding set the measure (`max-w-prose` remains for legal pages and descriptions). The renderer normalizes model spacing artifacts (`lib/summary-html.ts`): `<br><hr><br>` dividers, stray between-block breaks, and empty paragraphs are stripped. Timestamps, credit counts, and prices use `tabular-nums`. Inputs are ≥16px on mobile (`text-base sm:text-sm`) to prevent iOS zoom. Headings ≤ 2 lines in heroes. Body text never lighter than weight 400. Use `text-balance` / `text-pretty`, never an inline `textWrap` style.

## 4. Shape, borders, elevation

**Shape system (locked, documented per the Shape Consistency Lock):**

- Interactive pills: buttons, chips, toggles, audio pill, badge = `rounded-full`
- Containers: cards, sheet, dialogs, chat bubbles = `rounded-card` (24px, `--radius-card`)
- Inputs, textareas, popovers, kbd: `rounded-field` (12px, `--radius-field`)
- Nested surfaces follow concentric radius: outer = inner + padding

**Borders & elevation:** app cards are `bg-card` with `border border-border` (1px) and no shadow; the app summary card and source-data disclosure are borderless flat white directly on the canvas. Marketing/bento cards are borderless and float on `shadow-card`. Elevation is four tokens and nothing else:

- `shadow-overlay` — sheet, dialog, dropdown, select, tooltip
- `shadow-lift` — subtle hover-lift accents, active tab pill
- `shadow-card` — resting elevation for borderless bento/product cards (ink-tinted via `color-mix` on `--foreground`)
- `shadow-card-hover` — the lifted state of `shadow-card`; same two-layer structure so the transition interpolates cleanly

Tailwind's default `shadow-xs/sm/md/lg/xl` are banned and fail `pnpm check:tokens`. Dividers inside content (feed sections) are 1px `--border` hairlines; between unrelated groups prefer whitespace over lines (gap between groups ≥ 2× gap within).

## 5. Spacing & layout

- Spacing scale: Tailwind's 4px grid. Use only whole-grid spacing tokens whose resolved values are multiples of 4px (`p-1`, `gap-2`, `py-3`); fractional steps such as `0.5`, `1.5`, and `2.5` are not allowed in new work. If the scale does not cover a spacing role, add a named token in `globals.css` and document it here instead of using an arbitrary value. Section rhythm on marketing pages: `py-24`–`py-32`. App pages: `py-10`–`py-16`.
- Content containers: marketing `max-w-5xl` (nav, main, footer share the one column), app content column `max-w-4xl` (bar and content on one grid), sheets `max-w-sheet` (640px, `--container-sheet`), prose `max-w-prose`.
- Marketing header: sticky glass bar — `bg-background/70` + `backdrop-blur-md backdrop-saturate-150` + `border-b border-border/70` hairline; content scrolls beneath it.
- Layout margins: ≥16px inline on mobile; controls never touch viewport edges; media may bleed.
- Alignment: app pages left-aligned. Landing hero is a centered stack (headline, subhead, CTA) over a bento grid: the summary preview card spans two thirds, three feature tiles stack beside it, collapsing to single column under `lg`.
- Progressive disclosure: anything scrollable shows a peeking next item (16–32px) or a disclosure control.
- Logical properties (`ps-*`, `me-*`) over physical left/right.

## 6. Motion

Quiet and functional. Easing is one token, `ease-brand` (`cubic-bezier(0.16, 1, 0.3, 1)`); durations 150–300ms (600ms only for scroll-entry on marketing pages).

- Press: the `press` utility on buttons/chips/toggles (`--press-scale`, exactly 0.96). Never hand-write the scale.
- Hover: color/opacity shifts ≤200ms. Bento cards settle upward 4px while their shadow deepens (`transition-[translate,box-shadow]`, 300ms, `ease-brand`, `shadow-card → shadow-card-hover`) — one interruptible transition, specific properties only, never `transition: all`.
- CTA buttons carry a trailing arrow that nudges 2px right on hover (`group-hover:translate-x-0.5`), and the button itself lifts half a step.
- Enter/exit: sheet slides from left 300ms; dialog fade+scale from 0.98; exits softer than enters, small fixed `translateY`, `ease-out`.
- Staggered reveals: marketing sections and feed sections fade in `translateY(12px)`, 80ms stagger, `IntersectionObserver` or Motion `whileInView`, `viewport={{ once: true }}`.
- Chat panel: desktop open animates the column width (300ms `ease-brand`) while the floating card slides in from the right; mobile fades up as an overlay. Panel content (messages/empty state, composer) staggers in 80ms steps off the panel's `data-state`. Starter-question cards straighten from their resting tilt and lift on hover (200ms, `transition-[rotate,translate,scale,box-shadow]`). Width transitions are suspended while the user drags the resize handle.
- Icon state changes cross-fade (opacity 0→1, scale 0.25→1, blur 4px→0), spring `duration 0.3, bounce 0`.
- Generation progress: the stage list animates state changes; no infinite loops besides the active-stage indicator and audio-playing state.
- Restraint: no custom animation on high-frequency interactions; every animated state change also has a static cue. All motion honors `prefers-reduced-motion` (collapse to instant). No `window.addEventListener('scroll')`; no marquees; max one decorative animation per page.

## 7. Iconography

**Phosphor Icons** (`@phosphor-icons/react`), regular weight, one family only (replace shadcn's default lucide imports when generating components). Stroke presence matches text weight (1.5px beside 400 text, bolder beside 600). Icons use `currentColor`; states via CSS color/opacity, never separate assets. Outline = default, Fill = active. Decorative sparkles are brand SVG assets, not icon-font glyphs.

## 8. Component inventory

Base primitives via `npx shadcn@latest add`, then restyled through tokens (never ship default shadcn state). Custom composites live in `components/feedtldr/` and are built from the primitives.

| Component | Base | Notes |
| --- | --- | --- |
| `Button` | shadcn button + CVA | Variants: `default` (mint fill, ink text, `--btn-border` outline), `tonal` (accent wash + thin ink border, fills mint on hover), `outline` (white fill, thin ink border), `secondary`, `ghost`, `destructive`, `link`, icon sizes. Hover washes use `--accent`. Disabled is neutral: `bg-muted` + muted text, never faded green. Press scale 0.96 |
| `GlassHeader` | custom | The sticky glass bar shared by `MarketingNav` (hairline edge) and `AppBar` (`bordered={false}`, no hairline); `className` sets the container width |
| `AppBar` | custom | On `GlassHeader`: settings icon-button left; Re-generate primary + AI chat outline + Avatar right (labels collapse to icons under `sm`). Avatar shows the Google `photoURL` when present, else initials |
| `MarketingNav` | custom | Sticky glass bar (§5). Logo left; Pricing + auth-aware `NavAuthButton` right ("Your brief" when signed in, "Log in" otherwise, both `tonal`); ≤72px tall |
| `SummaryPreview` | custom (landing) | Hero product card: dated brief with decorative Play pill and `SummaryProse` sample, borderless on `shadow-card` |
| `Footer` | custom | Copyright + legal links |
| `Card` | shadcn card | 24px radius, border, no shadow |
| `Sheet` | shadcn sheet | Available primitive (mobile drawers); settings moved to `SettingsDialog` |
| `SettingsNav` + settings cards | custom (`components/feedtldr/settings/`) | Settings is a page (`/app/settings/*`): flat full-height nav panel (w-72, border, no shadow, 8px inset from the viewport, sticky; groups "Your account" / "Your summary"; base-size pill items) beside the content column; "Back to summary" lives in the content column, not the panel. Sections are bordered soft-shadow cards. Mobile: horizontal pill strip |
| `ChatPanel` | custom | Persistent right side panel on `/app` (full-screen under `lg`), Dia-style: a floating white `rounded-card` with a 1px `--border` stroke (no shadow) spanning the full viewport height (8px insets), sitting beside the whole app column — opening it pushes the app bar and summary left together. Default 448px wide, drag-resizable 380–600px via the handle on its left edge (double-click resets; arrow keys resize). Header w/ credits + clear + close, user messages as mint bubbles, assistant replies as plain prose. Kept mounted while closed so the conversation survives reopening |
| `ChatComposer` | custom (part of ChatPanel) | Floating white card (`rounded-card` + `shadow-card`, hairline border that darkens on input focus): context cards row above a borderless input, plus-menu (DropdownMenu checkboxes) to add/remove context, round mint send. Context cards are `bg-secondary` `rounded-xl` chips w/ icon tile + two-line label; hover/focus reveals a remove button |
| `ChatEmptyState` | custom (part of ChatPanel) | A loose stack of tilted starter-question cards (`shadow-card`, alternating ±2–3° tilts, slight overlap); hover/focus straightens and lifts a card (`shadow-card-hover`), click drops its question into the composer. One-line title + subline below |
| `Dialog` | shadcn dialog | Generate options, confirmations; white (`bg-card`) on the scrim |
| `Input`, `Textarea`, `Select` | shadcn | 12px radius, cream fill on white cards, visible focus ring |
| `Field` | shadcn field | Label + control + description + error. Every form field uses it; no hand-rolled `grid gap-2` |
| `Table` | shadcn table | Source-data rows |
| `ToggleGroup` | shadcn toggle-group | Segmented pills (billing interval) |
| `TagInput` | custom (Input + Badge) | X-account chips: type, Enter to add, X to remove, paste-splits on commas; chip list caps at `max-h-64` and scrolls under an optional glassy sticky `listFooter` (verify when unverified handles exist / import / clear-with-inline-confirm) |
| `AccountsField` | custom | TagInput + plan-limit notice, plus `VerifyAccountsButton` and `ImportAccountsDialog`. Shared by the settings sheet and onboarding |
| `AccountChip` | Badge | Handle + verification state (pastel semantics §2) |
| `Notice` | custom | Inline message block, tones info/warning/success/error, filled or plain. The only pastel surface |
| `Spinner` | custom | The one busy indicator; `label` when it stands alone |
| `PageHeader` | custom | Title + description + supporting controls, at `text-display-lg` |
| `EmailChipList` | custom | Newsletter recipient(s); remove-to-unsubscribe with confirm |
| `FeedSection` | custom | Headline + body + links list; hairline-separated (mock 2) |
| `SummaryProse` | custom | Sanitized `summary_html` renderer via `normalizeSummaryHtml`; prose fills its card; source links render as icon pills |
| `PostHoverPreviews` | custom | Wraps `SummaryProse`: hovering/focusing a source link shows the original post verbatim in a floating card (matched by status id from source data); dismissed on page scroll; touch skips to X |
| `AudioPill` | custom | "Play summary" outline pill wrapping `<audio>`; progress bar + time (`tabular-nums`) appear only while listening and reset when playback ends |
| `GenerationProgress` | custom | Stage list (collect → summarize → audio → email) driven by `pipeline_status` polling; skeleton-first |
| `CreditBadge` | custom | Cost + remaining credits, `tabular-nums` |
| `Avatar` | shadcn avatar | Initials on the `--accent` green tint |
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

- **Landing `/`** — sticky glass MarketingNav; centered hero (display-xl in `font-display`, ≤2 lines on desktop, subhead ≤25 words, "Get your first brief" primary pill + "Free to start" note); bento grid (SummaryPreview two-thirds + inbox/chat/listen tiles with neutral icon chips); below the fold only a slim 3-step strip and a closing CTA; footer. Source links inside summary prose render as icon pills (`.summary-prose` styles).
- **Feed `/app`** — sticky glass AppBar; one flat white card holding "Today's Feed" (display-lg), "Generated on …" muted with user-timezone formatting, AudioPill, and the summary prose (no dividers — whitespace separates sections; PostHoverPreviews on source links). Below it, a quiet "Source data" disclosure card (StatCards + Charts + DataTable, fetched on open; hidden for demo feeds). States: demo (banner + demo summary), generating (GenerationProgress card), error (inline with retry), empty-scrape (explain + link to settings). Anything that fetches shows a shape-matched Skeleton, never a pop-in.
- **Settings `/app/settings/*`** — floating sidebar nav (groups: Your account -> Profile, Billing; Your summary -> Accounts, AI prompt, Daily email) beside a `max-w-2xl` content column. Profile: details + danger zone. Billing: plan/credits + period usage. Accounts: TagInput with verify/import/clear on the glassy footer. AI prompt: textarea, save appears only when changed. Daily email: subscription-aware control (Subscribed label / Update / Subscribe, fixed-width slot) + timezone card. Inline validation below fields; plan-limit notices with upgrade link.
- **Generate dialog** — fetch-latest toggle vs re-summarize, theme/prompt, CreditBadge cost preview, Generate primary; disabled states explain why (no accounts / none verified / insufficient credits).
- **Auth `/login` `/signup`** — single centered card on cream, logo, email+password + Google button, plain error copy; password requirements as helper list.
- **Onboarding `/onboarding`** — 3 steps (add accounts → verify → newsletter email), OnboardingSteps progress, skippable where safe.
- **Chat** — persistent right side panel on `/app` (no separate route): a full-height floating white rounded card beside the app column — opening it pushes the app bar and summary content left together on desktop (drag-resizable width); full-screen sheet on mobile; message list + composer with context cards, credits per message noted, clear-chat, closable at any time with history kept while on the page.
- **Pricing `/pricing`** — PricingCards from plan config; current plan + usage meters for signed-in users; checkout/portal via API.
- **Profile** (menu from Avatar) — name edit, plan + credits, manage subscription (portal), logout, delete account (typed confirmation dialog).
- **Legal** `/terms`, `/privacy`, `/imprint`, `/about`, `/contact` — prose pages, `max-w-[65ch]`.

## 10. Accessibility baseline

Enabled buttons and `role="button"` elements show the pointer cursor (base rule in `globals.css`); disabled ones keep the default cursor. Focus-visible rings on every interactive element via the `focus-ring` utility (`--ring-width` 1.5px of ink `--ring` at 100%) — one definition, never re-stated per component. Hit areas ≥40px. Labels above inputs, errors below, no placeholder-as-label. Landmarks + skip link in app shell. Sheet/dialog trap focus and restore on close. Audio player fully keyboard-operable. Contrast: all text AA minimum (this is why `--link` is darker than the mock; verify chips' pastel text pairs). `prefers-reduced-motion` respected globally. Charts get text alternatives (StatCards carry the numbers).

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
