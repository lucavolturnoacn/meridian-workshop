# UI Design Skill — Meridian Components

Applies when making visual changes to the Vue 3 frontend. Follow these rules so every new component looks native to the existing design system.

## Design Tokens

All colors, spacing, and elevations come from CSS custom properties defined in `client/src/App.vue` `:root` block. Never hardcode hex values — use the variables.

| Purpose | Variable |
|---|---|
| Page background | `var(--bg-app)` |
| Card / surface | `var(--bg-surface)` |
| Subtle background | `var(--bg-subtle)` |
| Muted background | `var(--bg-muted)` |
| Primary text | `var(--text-primary)` |
| Secondary text | `var(--text-secondary)` |
| Body text | `var(--text-body)` |
| Muted text | `var(--text-muted)` |
| Default border | `var(--border-default)` |
| Subtle border | `var(--border-subtle)` |

Semantic colors (keep hardcoded — they don't change in dark mode):

| Purpose | Value |
|---|---|
| Success | `#059669` bg `#d1fae5` |
| Warning | `#92400e` bg `#fed7aa` |
| Danger | `#991b1b` bg `#fecaca` |
| Info / primary | `#1e40af` bg `#dbeafe` |

## Component Patterns

### Cards
```css
.card {
  background: var(--bg-surface);
  border-radius: 10px;
  padding: 1.25rem;
  border: 1px solid var(--border-default);
  margin-bottom: 1.25rem;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
```

### Stat Cards
Use global `.stat-card` + modifier class: `danger`, `warning`, `success`, `info`.
- `.stat-label`: uppercase, 0.875rem, `var(--text-muted)`
- `.stat-value`: 2.25rem, bold, `var(--text-primary)`

### Badges
Use global `.badge` + modifier: `success`, `warning`, `danger`, `info`, `high`, `medium`, `low`, `increasing`, `decreasing`, `stable`.

### Tables
- Wrap in `.table-container` (provides `overflow-x: auto`)
- Use global `table`, `thead`, `th`, `td` styles — they already use CSS variables
- Priority row accents: left border on first cell (`border-left: 3px solid <color>`)

### Page Header
```html
<div class="page-header">
  <h2>{{ t('section.title') }}</h2>
  <p>{{ t('section.description') }}</p>
</div>
```

## Typography Scale

| Role | Size | Weight |
|---|---|---|
| Page heading | 1.875rem | 700 |
| Card title | 1.125rem | 700 |
| Body | 0.938rem | 400 |
| Table header | 0.75rem | 600 uppercase |
| Table cell | 0.875rem | 400 |
| Badge / label | 0.75rem | 600 uppercase |

## Spacing

Base unit: `0.25rem` (4px). Prefer: `0.5rem`, `0.75rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`.

## Dark Mode

Every new component gets dark mode for free if it uses CSS variables. Two things to verify:
1. Scoped styles: if you use `background: white` or any literal color, replace it with the appropriate variable.
2. FilterBar / other sticky elements: need an explicit `html[data-theme="dark"] .component` override in `App.vue` (scoped styles can't be overridden from the global sheet otherwise).

## i18n

Every user-visible string goes through `t()`. Add keys to both `en.js` and `ja.js` before using them. Reuse existing keys across views where the text is the same (e.g., `dashboard.inventoryShortages.orderId` for "Order ID" column headers).
