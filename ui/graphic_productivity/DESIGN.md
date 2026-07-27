---
name: Graphic Productivity
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Anton
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  shadow-offset: 4px
---

## Brand & Style

This design system adopts a **Refined Graphic Novel** aesthetic, blending high-end productivity with the structural energy of comic book art. The brand personality is authoritative yet expressive, moving away from sterile SaaS minimalism toward a tactile, "ink-and-paper" experience.

The style leverages **Modern Brutalism** filtered through an editorial lens. Key visual identifiers include bold "inked" strokes, halftone textures for depth, and "hard" offset shadows that create a cel-shaded dimension. The UI should feel like a high-velocity workspace—structured, legible, and visually impactful without descending into caricature.

## Colors

The palette is anchored by a **Paper-White (#FDFDFB)** base, providing a physical, non-digital texture. 

- **Primary (Indigo):** A vibrant, high-energy indigo used for core actions and primary ink-work.
- **Secondary (Amber):** A rich, comic-book gold used for highlights, "important" states, and warnings.
- **Neutral:** A deep "Inker's Black" (#111827) used for all borders, shadows, and primary text to maintain high contrast.
- **Surface Accents:** Use a 5% opacity halftone dot pattern (Indigo or Neutral) to fill secondary containers or cards, replacing standard grey fills.

## Typography

The typography strategy relies on the tension between the loud, impactful **Anton** for display titles and the precise, professional **Hanken Grotesk** for functional text.

- **Headlines:** Must always be uppercase with tight line height. This mimics the "Title Card" energy of graphic novels.
- **Body Text:** Kept clean and airy to ensure productivity remains the priority. 
- **Character:** Use slight rotation (1-2 degrees) on specific "Callout" labels or badges to enhance the hand-drawn feel, but keep all primary body text perfectly horizontal for readability.

## Layout & Spacing

The layout is built on a strict **12-column fluid grid** but uses "blocky" containment. 

- **Gutter & Margins:** Generous spacing ensures that bold borders don't make the UI feel cramped. 
- **Hard Offsets:** All primary interactive elements use a fixed 4px horizontal and vertical offset for shadows, creating a "stacked" physical effect.
- **Rhythm:** Spacing follows a 4px baseline. Components should be padded with clear breathing room (16px, 24px, or 32px) to balance the heavy visual weight of the borders.

## Elevation & Depth

This system rejects blurs and gradients. Depth is communicated through **Line Weight** and **Hard Shadows**:

1.  **Level 0 (Background):** Paper-White (#FDFDFB) with optional 2% halftone pattern.
2.  **Level 1 (Cards/Containers):** 2px Neutral border. No shadow. Halftone fill for non-interactive areas.
3.  **Level 2 (Interactive/Floating):** 3px Neutral border with a 4px "Hard" Neutral shadow offset (bottom-right).
4.  **Halftone Usage:** Apply a CSS `mask-image` or background-image halftone pattern to secondary cards. This pattern should be fixed-position so it feels like the element is "cut out" of a printed page.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness to prevent the UI from looking overly aggressive or "pointy," while maintaining the structure of a professional tool. 

- **Irregularity:** For decorative elements (like tooltips or featured cards), use a `border-radius` that varies slightly on each corner (e.g., `4px 2px 5px 3px`) to simulate a hand-drawn stroke.
- **Speech Bubbles:** AI messages and tooltips should feature a small triangular "tail" at the bottom-left or bottom-right, maintaining the 2px border and hard shadow.

## Components

### Buttons
Primary buttons use the 3px border, vibrant Indigo background, and the 4px hard shadow. On `active` (click) states, the shadow should disappear, and the button should translate 4px down and right to simulate a physical "press."

### Input Fields
Inputs use a 2px border. When focused, the border weight remains 2px but changes color to Indigo, accompanied by a subtle 2px Indigo "hard" shadow.

### Cards
Cards are the primary structural unit. Use the 2px border. For "featured" content, add the halftone pattern fill. Header areas within cards should be separated by a 2px horizontal "ink" line.

### Progress Bars & Checkboxes
- **Checkboxes:** Square with a 2px border. The "Check" mark should appear as a thick, hand-drawn "X" or "V" stroke.
- **Progress Bars:** Use a 2px border for the container. The fill should be a solid color (Indigo or Amber) or a high-contrast diagonal stripe pattern.

### Tooltips & AI Prompts
Designed as speech bubbles. Use a solid Paper-White background with a 2px border. The "tail" must be part of the border stroke to ensure it looks like a single inked shape.