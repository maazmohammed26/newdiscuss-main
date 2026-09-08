# Discuss Frontend Accessibility (A11y) Standards

## 1. Keyboard Navigation
- Interactive elements receive consistent focus ring: `outline: 2px solid #0095F6; outline-offset: 2px;`.
- Esc key dismisses dialogs, sheets, menus, and photo viewers.
- Tab sequence follows visual reading order without trapped focus.

## 2. Screen Readers & Semantics
- Native `<button>`, `<nav>`, `<aside>`, `<header>`, `<main>` semantic landmarks.
- All icon-only buttons include descriptive `aria-label`.
- Dynamic unread counters and badge updates announced via `aria-live="polite"`.

## 3. Visual & Motion Adaptations
- `prefers-reduced-motion`: Disables non-essential layout transforms and spring shifts.
- Color contrast meets WCAG AA 4.5:1 ratio for text against surface.
