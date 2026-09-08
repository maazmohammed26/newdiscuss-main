# Discuss Responsive Layout Rules

## 1. Breakpoints
- **Mobile Compact**: `< 380px` (small Android / SE)
- **Mobile Standard**: `380px – 639px` (iPhone 14/15/16, modern Android)
- **Tablet Portrait**: `640px – 767px`
- **Tablet Landscape / Small Laptop**: `768px – 1023px`
- **Desktop**: `1024px – 1439px`
- **Wide Desktop**: `>= 1440px`

## 2. Platform Safe Areas
- Mobile top bars: `padding-top: max(12px, env(safe-area-inset-top, 0px))`
- Mobile bottom nav: `padding-bottom: max(10px, env(safe-area-inset-bottom, 0px))`
- Keyboard avoidance: Interactive message composers dynamically adapt to viewport height.

## 3. Structural Rules
- **Mobile**: Single-column focus, top persistent branding bar, bottom tactile navigation. No multi-column distraction.
- **Desktop**: Left persistent navigation rail (244px), centered content feed (max 630px), right contextual rail (320px) where appropriate.
