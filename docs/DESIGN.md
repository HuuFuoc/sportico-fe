---
name: Minimalist Sports Performance System
colors:
  surface: '#f9f9f8'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#464555'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1f0'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#58579b'
  on-secondary: '#ffffff'
  secondary-container: '#b6b4ff'
  on-secondary-container: '#454386'
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
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#140f54'
  on-secondary-fixed-variant: '#413f82'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f9f9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
This design system prioritizes clarity and utility, drawing inspiration from the structured efficiency of Linear and the spatial organization of Notion. It is built for sports coaches who require high information density without cognitive overload. 

The aesthetic is **Minimalist and Functional**, characterized by a strictly flat UI, generous white space, and a restrained color palette. It avoids all decorative elements like gradients or heavy shadows, relying instead on precise alignment, consistent borders, and a singular accent color to guide the user's focus. The emotional response should be one of professional calm, reliability, and technical precision.

## Colors
The palette is monochromatic with a singular functional accent. 
- **Core Surfaces:** The primary background is pure white (#FFFFFF). The secondary surface (#F9F9F8) is used for sidebars, background wells, and subtle grouping.
- **Borders:** A consistent #E8E8E5 is used for all structural lines, card strokes, and dividers.
- **Accent:** Indigo (#4F46E5) is reserved exclusively for interactive triggers (CTAs), active navigation states, and AI-enhanced features.
- **AI Branding:** AI-driven insights or automated coaching suggestions are marked by small Indigo badges or 12px sparkle icons to differentiate machine-generated content from manual entries.

## Typography
The system uses **Inter** exclusively to maintain a systematic, utilitarian feel. 
- **Headings:** Set at medium weight (500) with slight negative letter-spacing for larger sizes to increase density and "tech" feel.
- **Body:** Standard weight (400) for readability. The minimum font size is strictly enforced at 12px for labels and metadata.
- **Hierarchy:** Contrast is achieved through size and color (Primary Text vs Secondary Text) rather than weight variations.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Navigation and sidebars are fixed-width (following Notion's sidebar pattern), while the main content area utilizes a fluid grid that optimizes for information density.

- **Rhythm:** An 8px base unit governs all dimensions.
- **Grid:** Use a 12-column grid for dashboard views, with 16px gutters.
- **Margins:** Standard page margins are 24px. On mobile, margins reduce to 16px and the grid collapses to a single column.

## Elevation & Depth
This system rejects traditional shadows. Depth is communicated through **Low-contrast outlines** and **Tonal layering**:
- **Layer 0:** Background (#FFFFFF).
- **Layer 1:** Surface (#F9F9F8) used for recessed areas like sidebars or table headers.
- **Layer 2:** Cards/Modals (#FFFFFF) with a 1px solid border (#E8E8E5).
- **Interactions:** Hover states are indicated by a subtle background shift to #F4F4F2 or a slightly darker border color, never by a shadow.

## Shapes
The shape language is controlled and precise.
- **Cards:** Use a specific 10px radius to create a soft but distinct container.
- **Interactive Elements:** Buttons and Input fields use a tighter 6px radius to appear more technical and aligned with the typography.
- **Icons:** Use a 1.5px or 2px stroke width to match the visual weight of the Inter typeface.

## Components
- **Buttons:** Primary buttons are Indigo (#4F46E5) with white text. Secondary buttons have a white background, 1px #E8E8E5 border, and primary text. No shadows or gradients.
- **Cards:** Pure white background, 1px #E8E8E5 border, 10px radius, and 16px internal padding. 
- **Inputs:** 1px #E8E8E5 border with a 6px radius. Focus state shifts the border to Indigo (#4F46E5) with no outer glow.
- **AI Badge:** A small, pill-shaped badge with an Indigo background (10% opacity) and Indigo text, or a simple 12px indigo sparkle icon adjacent to the text.
- **Chips/Status:** Small, square-edged or slightly rounded (4px) tags using neutral grey backgrounds or subtle status colors (Green/Red) at low saturation.
- **Lists:** Clean rows separated by 1px #E8E8E5 dividers, with a subtle #F9F9F8 background shift on hover.