# FedHealth AI — Design System (Foundation)

Samsung OneUI-inspired spacing and softness, with F1-style telemetry clarity for clinical metrics.

**Status:** Global tokens and utilities only. Pages are not migrated yet.

## Tokens (`:root` in `app/globals.css`)

| Token | Purpose |
|-------|---------|
| `--background` | Page base (cool soft white-blue) |
| `--surface` | Translucent card layer |
| `--surface-elevated` | Raised panels |
| `--primary` | Sky blue accent |
| `--primary-soft` | Tinted backgrounds |
| `--risk-high` / `--risk-medium` / `--risk-low` | Clinical risk semantics |
| `--text-primary` / `--text-secondary` | Readable hierarchy |
| `--border-soft` | Thin blue-gray borders |
| `--shadow-soft` | Floating elevation |
| `--glow-primary` | Hover / focus glow |

Tailwind v4 maps these via `@theme inline` (e.g. `bg-primary`, `text-text-secondary`).

## Liquid glass (dashboard + shell)

| Class | Use |
|-------|-----|
| `app-shell-bg` | Main content gradient mesh background |
| `liquid-glass` | Generic frosted panel |
| `liquid-glass-kpi` | KPI / telemetry metric tiles |
| `liquid-glass-panel` | Charts, tables, large sections |
| `liquid-glass-strip` | Compact vitals strip |
| `btn-liquid-primary` | Sky gradient primary actions |
| `status-pill-glass` | Frosted status badges |
| `app-sidebar` | Fixed liquid glass navigation rail |

## Utility classes

| Class | Use |
|-------|-----|
| `glass-card` | Glassmorphism surfaces |
| `telemetry-card` | Metric tiles with top accent line |
| `gradient-border` / `gradient-border-sky` | Premium bordered panels |
| `soft-hover` / `glow-hover` | Interaction feedback |
| `status-pill` | Tags and labels |
| `risk-pill--high\|medium\|low` | Risk categories |
| `ai-panel` | Explainability / AI blocks |
| `floating-sidebar` | Navigation shell |

## Typography

| Class | Use |
|-------|-----|
| `ds-heading-page` | Page titles |
| `ds-heading-section` | Section titles |
| `ds-label-telemetry` | Uppercase metric labels |
| `ds-metric-value` | Large numeric values |
| `ds-text-clinical` | Body clinical copy |
| `ds-text-support` | Secondary descriptions |

## Gradients

- `gradient-sky` — primary CTA / highlights
- `gradient-teal` — secondary accent
- `gradient-cyan-white` — soft panel fills
- `gradient-medical-glow` — ambient hero glow

## Layout helpers

- `ds-page`, `ds-section`, `ds-stack-md`, `ds-grid-metrics`

## Next step (not done yet)

Apply utilities page-by-page: dashboard, prediction, patients, explainability, federated, fairness.
