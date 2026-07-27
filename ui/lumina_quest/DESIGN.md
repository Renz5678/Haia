---
name: Lumina Quest
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#464555'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#835500'
  on-secondary: '#ffffff'
  secondary-container: '#feae2c'
  on-secondary-container: '#6b4500'
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
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#ffb955'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
  surface-muted: '#EDEDEA'
  border-hairline: '#E5E5E2'
  xp-gold: '#F5A623'
  indigo-deep: '#4F46E5'
typography:
  display-hero:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-xp:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  sidebar-width: 64px
  sidebar-expanded: 240px
  max-width-content: 1100px
---

## Brand & Style

The design system is engineered for a "personal life-and-school management system" that bridges the gap between high-utility productivity tools and immersive gaming experiences. The brand personality is disciplined yet rewarding, aiming to evoke a sense of "calm momentum."

The design style is a hybrid of **Minimalism** and **High-Contrast Bold**. It leverages the expansive whitespace and structural clarity of high-end design tools, punctuated by the aggressive, oversized typography found in modern AI interfaces. This creates a "Quiet Power" aesthetic: the UI stays out of the way during deep work but celebrates achievements with cinematic scale. The interface transition between a structured "Enterprise" list view for academic planning and a high-contrast "Messenger" view for AI-driven coaching.

## Colors

The palette is rooted in a warm, sophisticated "Paper" aesthetic. 

- **Primary Background:** `#FAFAF8` (Warm off-white) provides a non-clinical, academic feel that reduces eye strain compared to pure white.
- **Primary Action:** `#4F46E5` (Deep Indigo) is used for high-intent actions, navigation states, and primary CTAs, signaling professional reliability.
- **Gamification Accent:** `#F5A623` (Warm Amber) is reserved strictly for game-mechanic elements: XP gains, streak counters, and level-up indicators. This color should never be used for standard UI buttons to maintain its "reward" value.
- **Neutrals:** Text and dark surfaces utilize `#141414`, a near-black that provides high-contrast legibility against the off-white base. Borders and dividers use a subtle hairline gray (`#E5E5E2`) to maintain structure without visual clutter.

## Typography

This design system uses a dual-font strategy. **Hanken Grotesk** is the display powerhouse, used for oversized hero statements and section headings. It should be set with tight tracking (letter-spacing) to mimic the "Parker" energy. 

**Inter** handles the functional heavy lifting. It is used for lists, descriptions, and system labels. Body text should be well-kerned with generous line heights to ensure readability in long-form task descriptions or chat logs.

For gamified elements like XP values, use the Bold weight of Hanken Grotesk to differentiate "earned data" from "system data."

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is centered within a 1100px container for maximum focus, while background surfaces bleed to the edges.

- **Sidebar:** A slim, collapsible left rail (64px collapsed / 240px expanded) houses primary navigation. It uses a clear vertical rhythm to separate "School" (Management) from "Quest" (Game) zones.
- **Grid:** A 12-column system is used for dashboard views. In the "Task List" view, columns are used to align checkboxes, titles, and XP chips with strict vertical consistency.
- **Chat View:** In the AI messenger mode, the layout shifts to a centered, narrow column (max-width 720px) to simulate a focused, intimate conversation.
- **Rhythm:** An 8px base unit (2 x 4px unit) dictates all padding and margins to maintain a clean, mathematical balance.

## Elevation & Depth

This design system eschews traditional shadows in favor of **Tonal Layering** and **Structural Outlines**.

- **Base Layer:** The primary off-white surface (`#FAFAF8`).
- **Mid Layer:** Cards and secondary containers use a soft gray (`#EDEDEA`) or a white fill with a 1px hairline border (`#E5E5E2`). This creates "flat depth" where hierarchy is defined by color shifts rather than shadows.
- **Floating State:** Only high-priority temporary elements—such as active search inputs, modals, or hovering tooltips—receive an ambient, low-opacity shadow to indicate they exist on a separate Z-plane.
- **Messenger Bubbles:** Chat bubbles use high-contrast fills (Near-black for user, Bordered-transparent for AI) to create immediate visual separation without needing elevation.

## Shapes

The shape language is "Soft-Modern." A standard **12px (0.75rem)** radius is applied to all cards, buttons, and input fields. 

Small components like checkboxes and tags use a smaller 4px radius to feel precise, while the XP chips and Level Badges use a **Pill-shape (Full round)** to differentiate them as "Game Objects." The mix of 12px corners for containers and full-round for game elements creates a clear visual distinction between the "System" and the "Game."

## Components

- **Buttons:** Primary buttons are Indigo (`#4F46E5`) with white text, 12px radius. Secondary buttons use the hairline border with no fill.
- **Task Cards:** A horizontal layout. Left-aligned custom checkbox (Indigo on check) -> Title (Inter, Semi-bold) and Metadata (Inter, Regular, Muted) -> Right-aligned XP Chip (Amber background, Black text, Pill-shaped).
- **Gamification Elements:** 
    - **Progress Bars:** Thin 4px height, track in soft gray, fill in Amber.
    - **Streak Flame:** A custom icon paired with an Amber counter, appearing in the top navigation bar.
- **Input Fields:** Minimalist design with a 1px hairline border. On focus, the border thickens to 2px Indigo or adds the "Floating" shadow effect for AI prompts.
- **Messenger UI:** Large-scale typography for AI responses to emphasize the "Parker" influence. Text bubbles for the AI are simply outlined, while user bubbles are solid near-black for a high-contrast "Dark Hero" look.
- **Sidebar Rail:** Icons only when collapsed; Icon + Label when expanded. Active states are indicated by an Indigo vertical bar on the far left.