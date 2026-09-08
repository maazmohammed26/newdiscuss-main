# Discuss Design System Specification (v2.0)

## 1. Vision & Design Philosophy
Discuss is an authentic, high-velocity social network engineered for creators, engineers, and modern communities.
Its design language blends:
- **Instagram-level content hierarchy and polish**: Focus on media, structured readable posts, fluid feed browsing.
- **WhatsApp-level clarity and messaging responsiveness**: High-density conversation view, instant local updates, reliable status indications.
- **Apple-grade motion and tactile feedback**: Restrained physics, spring dampening, micro-interactions, subtle acoustic confirmations.
- **Zero generic AI UI tropes**: No arbitrary rainbow gradients, no glass cards plastered over content, no meaningless sparkle/star icons, strictly no emojis in system iconography.

---

## 2. Color System & Surfaces

### 2.1 Core Palette
Discuss supports dual primary modes: Clean High-Contrast Light and Pitch-Black Dark.

| Token | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(1.0 0 0)` (#FFFFFF) | `oklch(0 0 0)` (#000000) | App root canvas |
| `--foreground` | `oklch(0.18 0.01 265)` (#171717) | `oklch(0.97 0 0)` (#F5F5F5) | High-contrast body text |
| `--surface-primary` | `oklch(1.0 0 0)` (#FFFFFF) | `oklch(0.08 0 0)` (#121212) | Feed cards, dialogs, panels |
| `--surface-secondary`| `oklch(0.97 0.003 95)` (#F7F7F7) | `oklch(0.12 0 0)` (#1C1C1C) | Inputs, subtle chips, row hovers |
| `--surface-hover` | `oklch(0.95 0.004 95)` (#F0F0F0) | `oklch(0.16 0 0)` (#262626) | Interactive item active/hover |
| `--border-subtle` | `oklch(0.92 0.003 95)` (#E5E5E5) | `oklch(0.18 0 0)` (#262626) | Separators, subtle card rims |
| `--border-strong` | `oklch(0.85 0.005 95)` (#D4D4D4) | `oklch(0.25 0 0)` (#3A3A3A) | Focused inputs, tab lines |

### 2.2 Brand & Semantic Accents
- **Primary Accent (`--accent-blue`)**: `#0095F6` (Active: `#1877F2`, Soft: `rgba(0, 149, 246, 0.12)`)
- **Destructive / Alert (`--destructive`)**: `#ED4956` (Soft: `rgba(237, 73, 86, 0.12)`)
- **Success / Online (`--success`)**: `#10B981` (Soft: `rgba(16, 185, 129, 0.12)`)
- **Warning / Pending (`--warning`)**: `#F59E0B` (Soft: `rgba(245, 158, 11, 0.12)`)
- **Muted Text (`--text-secondary`)**: Light `#737373` / Dark `#A3A3A3`
- **Subtle Text (`--text-tertiary`)**: Light `#A3A3A3` / Dark `#666666`

---

## 3. Typography Scale & Screen Responsiveness

Base font stack: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
Monospace stack: `'Roboto Mono', monospace`.
Script logo only: `'Grand Hotel', cursive`.

### 3.1 Role Hierarchy & Responsive Sizing

| Role | Mobile (<640px) | Tablet (640–1024px) | Desktop (>1024px) | Weight | Tracking | Leading |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 24px (1.5rem) | 28px (1.75rem) | 32px (2.0rem) | 800 | `-0.03em` | 1.15 |
| **Large Title**| 20px (1.25rem)| 22px (1.375rem)| 24px (1.5rem) | 700 | `-0.025em`| 1.2 |
| **Title** | 17px (1.06rem)| 18px (1.125rem)| 19px (1.19rem) | 600 | `-0.02em` | 1.25 |
| **Headline** | 15px (0.94rem)| 15px (0.94rem) | 16px (1.0rem) | 600 | `-0.015em`| 1.3 |
| **Body** | 14px (0.875rem)| 14.5px | 15px (0.94rem) | 400 | `0` | 1.45 |
| **Secondary**| 13px (0.81rem)| 13px (0.81rem) | 13.5px | 400 | `0` | 1.4 |
| **Caption** | 12px (0.75rem)| 12px (0.75rem) | 12px (0.75rem) | 500 | `+0.01em` | 1.35 |
| **Micro** | 10.5px | 11px | 11px | 600 | `+0.02em` | 1.2 |
| **Button** | 14px (0.875rem)| 14px (0.875rem)| 14px (0.875rem)| 600 | `-0.01em` | 1.0 |
| **Navigation**| 11px / Icon | 14px text | 14px text | 500/600 | `0` | 1.0 |

---

## 4. Spacing, Radii & Depth

### 4.1 Strict Spacing Grid
All paddings, margins, and gaps adhere to the 4px baseline:
`4px` (xxs) • `8px` (xs) • `12px` (sm) • `16px` (md) • `20px` (ml) • `24px` (lg) • `32px` (xl) • `40px` (2xl) • `48px` (3xl)

### 4.2 Radii Tokens
- **Micro / Tag (`--radius-sm`)**: `6px`
- **Interactive Buttons / Inputs (`--radius-md`)**: `10px`
- **Cards / Containers (`--radius-lg`)**: `14px`
- **Modals / Sheets (`--radius-xl`)**: `20px`
- **Pill / Circular (`--radius-full`)**: `9999px`

### 4.3 Elevation & Borders
- Border: `1px solid var(--border-subtle)` (crisp, never blurred)
- Mobile Feed / Chat: Edge-to-edge separation with subtle 1px dividers
- Desktop Elevated Panels: `shadow-[0_4px_24px_rgba(0,0,0,0.06)]` in light mode, `border border-[#262626]` in pitch-black mode.

---

## 5. Icon System Specifications
- Standardized strictly on **Lucide React**.
- Default stroke width: `1.8px` (unselected), `2.4px` (selected/active).
- Standard sizes: `18px` (secondary actions), `20px` (standard actions), `24px` (navigation bars).
- Touch target minimum: `44px × 44px` on mobile, `36px × 36px` on desktop.
- Strictly NO emojis in UI chrome (no ❤️, 🔥, ✨, ⭐, 📌, 🚀, 💬). Use crisp SVG vectors.

---

## 6. Motion & Spring Physics
- **Fast Micro-interactions**: `150ms cubic-bezier(0.2, 0.0, 0.0, 1.0)`
- **Spring Sheet/Modal Transitions**: Tension: 320, Friction: 28
- **Button Press Feedback**: Pointer down `scale(0.97)` with immediate tactile response; release spring back `scale(1.0)`.
- **Accessibility (`prefers-reduced-motion`)**: Instant opacity crossfade (0.01ms duration), zero spatial translation.
