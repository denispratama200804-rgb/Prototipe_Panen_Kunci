---
name: Panen Kunci
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf6'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d3e3ff'
  on-surface: '#0b1c30'
  on-surface-variant: '#444652'
  inverse-surface: '#213146'
  inverse-on-surface: '#ebf1ff'
  outline: '#757684'
  outline-variant: '#c5c5d4'
  surface-tint: '#3d57ba'
  primary: '#00175c'
  on-primary: '#ffffff'
  primary-container: '#00288e'
  on-primary-container: '#7e97fe'
  inverse-primary: '#b8c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#9af2c5'
  on-secondary-container: '#0c714d'
  tertiary: '#080077'
  on-tertiary: '#ffffff'
  tertiary-container: '#170bae'
  on-tertiary-container: '#8f92ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#213da0'
  secondary-fixed: '#9df4c8'
  secondary-fixed-dim: '#81d8ad'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2dbe'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e3ff'
  success-emerald: '#6cf8bb'
  error-ruby: '#E11D48'
  warning-amber: '#F59E0B'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is engineered to balance the technical rigor of API management with the rewarding nature of a financial earnings platform. The brand personality is **Precise, Rewarding, and Secure**. It aims to evoke a sense of immediate professional trust while maintaining the high-energy "spark" associated with earning income.

The visual direction follows a **Corporate / Modern** aesthetic with **Glassmorphic** accents. It utilizes high-contrast typography and a "Deep Naval" foundation to signal security, punctuated by "Emerald Neon" highlights to celebrate user success and financial growth.

## Colors
This design system utilizes a high-fidelity palette designed for financial clarity. 

- **Primary (Deep Navy):** Used for navigation, primary branding, and core structural elements to establish authority.
- **Secondary (Emerald Success):** Reserved strictly for "value-add" moments—balance increases, successful submissions, and active earning states.
- **Backgrounds:** The default mode is light. Use a subtle off-white canvas (#F8FAFC) for the main application background to maintain a clean, airy feel that differentiates from the white surface cards.
- **Semantic Logic:** Error states use a high-chroma Ruby Red to ensure immediate attention to invalid security keys, while Warning Amber is used for pending verifications.

## Typography
The typography strategy employs a tiered approach to maximize readability and technical character:
- **Headlines:** Plus Jakarta Sans provides a friendly yet professional geometric structure. Use `display-lg` for wallet balances and key milestone screens.
- **Body:** Inter is used for all functional text, descriptions, and data lists to ensure maximum legibility at small sizes.
- **Technical Labels:** Space Grotesk is used for API keys, status badges, and metadata. Its technical width hints at the underlying utility of the product.

## Layout & Spacing
The design system uses an **8px soft-grid** system to maintain a rhythmic layout.

- **Mobile First:** A fluid grid with 16px side margins is standard. 
- **Content Grouping:** Use 24px (`lg`) spacing between distinct cards or sections. Use 8px (`sm`) for internal card elements, such as a label paired with its input.
- **Safe Areas:** On mobile devices, ensure all primary actions are positioned within the bottom 30% of the screen (the "thumb zone") to facilitate easy one-handed key submission and interaction.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** combined with **Ambient Shadows** to create a structured hierarchy.

1.  **Level 0 (Base):** The main background floor.
2.  **Level 1 (Cards):** White surfaces with a very soft, diffused shadow (Offset: 0, 4px; Blur: 20px; Opacity: 4% Black). Use a 1px border in a lighter neutral tint (#E2E8F0) to define edges without adding heavy visual weight.
3.  **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow (Offset: 0, 8px; Blur: 32px; Opacity: 8% Navy).
4.  **Glassmorphism:** For top navigation bars or floating action buttons, use a 12px backdrop blur with a 70% opacity white fill to maintain the context of the content scrolling beneath.

## Shapes
The shape language is modern and approachable, leaning towards rounded geometries. 
- **Standard Radius:** 12px for primary cards and input fields.
- **Large Radius:** 24px for main dashboard containers or highlight sections focused on earnings.
- **Pill Shapes:** Reserved exclusively for status indicators (e.g., "Active," "Verified") and the primary "Submit" buttons to encourage interaction.

## Components
- **Buttons:** Primary buttons should be full-width on mobile, using the Deep Navy background with white text. For success actions (like withdrawing funds), use the Emerald Green palette.
- **Key Input Fields:** Use a monospaced font for the input text to ensure technical accuracy. Include a "Paste" icon within the right-hand side of the field to streamline user workflow.
- **Earning Chips:** Small, pill-shaped badges using a light green tint background with dark green text to highlight rewards.
- **Status Cards:** Use a left-edge color accent (4px border) to indicate the status of a submitted key (e.g., Red for invalid, Green for verified).
- **Progress Steppers:** Use thin, 4px rounded bars to show verification stages, transitioning from Neutral to Emerald as processes complete.