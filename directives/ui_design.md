# Directive: UI / UX Design

**Source of truth**: [CLAUDE.md §UI/UX Design Policy](../CLAUDE.md)
**Build Guide reference**: §3 (User Personas & Core Use Cases)
**Module**: `frontend/`

## Design system

- **Framework**: Bootstrap 5 (CDN) — utility-first, no custom CSS unless a class exists in `global.css`
- **Tokens**: All colors, typography, spacing as CSS custom properties in `frontend/src/styles/global.css`
- **No hardcoded hex** — always `var(--color-*)` or Bootstrap utility classes

> **Conflict resolution**: Build Guide §7 specifies Tailwind. CLAUDE.md (the operating contract) supersedes it. We follow CLAUDE.md.

## Personas → Frontend surfaces

| Persona | Primary | Secondary |
|---|---|---|
| HR Manager | `/hr-dashboard` | `/recommendations`, `/notifications` |
| Operations Manager | `/operations-dashboard` | `/forecast` |
| IT Administrator | `/it-admin` | `/audit`, `/webhooks`, `/roles` |
| Executive | `/executive-dashboard` | `/analytics`, `/value-proposition` |
| Public / sales | `/`, `/value-proposition` | — |

## Accessibility (WCAG 2.1 AA — required)

- Focus indicators: `3px solid var(--color-primary-light)` on `:focus-visible`
- Touch targets: min 44×44 px on mobile
- Reduced motion: `prefers-reduced-motion: reduce` disables animations
- High contrast: `prefers-contrast: high` adds borders + full-contrast text
- Screen readers: status spinners use `role="status"` + `visually-hidden` text
- Skip link to main content

## Audience

Enterprise execs, 35–60. Clean, calm, authoritative. Bloomberg meets Salesforce.

## Verification

- Smoke: every route renders without crashing
- Visual regression (Phase 4 candidate): per-page screenshot diff in CI
- A11y audit (Phase 4 candidate): axe-core sweep with 0 critical findings
