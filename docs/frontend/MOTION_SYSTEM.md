# Discuss Motion & Interaction System Specification

## 1. Principles
- **Immediate Input Response**: Zero perceptible latency between touch/click down and visual reaction.
- **Physical Feel**: Interruptible springs, not arbitrary cubic-bezier or slow linear fades.
- **Content Continuity**: Elements expand or slide from their origin; scroll positions are remembered.
- **No `transition: all 0.3s ease`**: Explicit animated properties only (`transform`, `opacity`).
- **Full Respect for `prefers-reduced-motion`**.

## 2. Motion Classes & Configurations

| Category | Typical Use | Duration / Spring Config | Properties |
| :--- | :--- | :--- | :--- |
| **Instant Press** | Buttons, Avatars, Nav items | Immediate down (scale 0.97), 150ms release | `transform: scale(0.97)` |
| **Micro Confirm** | Heart / Upvote pop, Checkmark | Spring (stiffness: 450, damping: 20) | `transform: scale(1.15) -> 1.0` |
| **List Enter** | New feed items, Chat bubbles | 180ms ease-out | `opacity: 0->1`, `translateY: 8px->0` |
| **Bottom Sheet** | Mobile comments, Create sheet | Spring (stiffness: 320, damping: 30) | `translateY: 100%->0` |
| **Modal / Dialog** | Desktop create dialog, confirmation | 150ms ease-out | `opacity: 0->1`, `scale: 0.98->1.0` |
| **Toast / Alert** | Global brief confirmations | 200ms ease-out enter, 150ms leave | `translateY: -12px->0`, `opacity` |

## 3. Reduced Motion Policy
When `prefers-reduced-motion: reduce` is active:
- Transform animations are bypassed (`transform: none`).
- Motion transitions collapse to immediate or 1ms alpha blend.
- Interaction sounds remain independently configurable in Settings.
