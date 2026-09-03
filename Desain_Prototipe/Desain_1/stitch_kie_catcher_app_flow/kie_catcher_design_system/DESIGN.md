---
name: Kie Catcher Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#170cae'
  on-tertiary: '#ffffff'
  tertiary-container: '#3433c3'
  on-tertiary-container: '#b3b5ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  bg-subtle: '#F8FAFC'
  surface-card: '#FFFFFF'
  text-heading: '#0F172A'
  text-body: '#475569'
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
- **Backgrounds:** Use `bg-subtle` (#F8FAFC) for the main application canvas to maintain a clean, airy feel that differentiates from the white surface cards.
- **Semantic Logic:** Error states use a high-chroma Ruby Red to ensure immediate attention to invalid API keys, while Warning Amber is used for pending verifications.

## Typography
The typography strategy employs a tiered approach to maximize readability and technical character:
- **Headlines:** Plus Jakarta Sans provides a friendly yet professional geometric structure. Use `display-lg` for wallet balances and key milestone screens.
- **Body:** Inter is used for all functional text, descriptions, and data lists to ensure maximum legibility at small sizes.
- **Technical Labels:** Space Grotesk is used for API keys, status badges, and metadata. Its slightly technical, geometric width hints at the app's underlying "code-based" utility.

## Layout & Spacing
The design system uses an **8px soft-grid** system. 

- **Mobile First:** A fluid grid with 16px side margins is standard. 
- **Content Grouping:** Use 24px (`lg`) spacing between distinct cards or sections. Use 8px (`sm`) for internal card elements (e.g., a label and its input).
- **Safe Areas:** On mobile, ensure all primary actions are within the bottom 30% of the screen (the "thumb zone") to facilitate easy one-handed key submission.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** combined with **Ambient Shadows**.

1.  **Level 0 (Base):** The `bg-subtle` floor.
2.  **Level 1 (Cards):** White surfaces with a very soft, diffused shadow (Offset: 0, 4px; Blur: 20px; Opacity: 4% Black). Use a 1px border in a lighter neutral tint (#E2E8F0) to define edges.
3.  **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow (Offset: 0, 8px; Blur: 32px; Opacity: 8% Navy).
4.  **Glassmorphism:** For top navigation bars or floating action buttons, use a 12px backdrop blur with a 70% opacity white fill to maintain context of the content scrolling beneath.

## Shapes
The shape language is modern and approachable. 
- **Standard Radius:** 12px (`rounded-md`) for primary cards and input fields.
- **Large Radius:** 24px (`rounded-xl`) for main dashboard containers or "Earning" highlight sections.
- **Pill Shapes:** Exclusively for status indicators (e.g., "Active," "Verified") and the primary "Submit" buttons to encourage interaction.

## Components
- **Buttons:** Primary buttons should be full-width on mobile, using the Deep Navy background with white text. For "Success" actions (like withdrawing funds), use the Emerald Green.
- **API Input Fields:** Use a monospaced font for the input text. Include a "Paste" icon within the right-hand side of the field to streamline the user flow.
- **Earning Chips:** Small, pill-shaped badges using a light green tint background with dark green text to highlight money earned per key.
- **Status Cards:** Use a left-edge color accent (4px border) to indicate the status of a submitted key (e.g., Red for invalid, Green for verified).
- **Progress Steppers:** Use thin, 4px rounded bars to show the verification process of an API key, transitioning from Neutral to Emerald as stages complete.