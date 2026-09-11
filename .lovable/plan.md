# Refine Wazen’s existing visual financial storytelling

## Goal
Make the current Wazen experience feel more visual, responsive, and distinctive using only its existing financial data, charts, illustrations, progress, games, challenges, and badges. Preserve the current hierarchy, layout, routes, content, and functionality.

## Changes
- Keep adult and teen analytics visible by default, preserving the existing spending-category, income-versus-expenses, and savings-trend views.
- Refine the current charts so hover, keyboard focus, and tap clearly reveal exact localized values, active series/category states, and useful comparisons without adding new data or controls.
- Add concise, data-driven chart context using calculations already present, so each visualization communicates the current spending, income/expense, or savings story.
- Keep budget, emergency-fund, family-goal, savings-goal, child-goal, challenge, lesson, and level progress visually prominent with accessible values and restrained transitions tied only to real progress changes.
- Preserve every current Child and Learn illustration and keep Games, Challenges, Goals, Savings, and Badges visible with purposeful pressed, completed, earned, locked, and expanded states.
- Retain progressive disclosure only for secondary details; important charts and visual progress remain open and visible.

## Boundaries
- Frontend UX/UI refinement only.
- No new features, routes, data, calculations, filters, APIs, database work, authentication, subscriptions, family permissions, Zakat changes, or Anti-Gravity changes.
- No replacement illustrations, decorative animation, clickable decoration, or broad redesign.
- Preserve Arabic/English, RTL/LTR, light/dark themes, responsive layouts, accessibility, and reduced-motion behavior.

## Technical details
- Reuse the existing Recharts series, tooltips, active states, and semantic theme tokens.
- Derive chart context only from the transaction series already computed by the dashboard.
- Use the existing progress and interaction classes; transitions remain value-linked and disabled by reduced-motion preferences.

## Verification
- Run TypeScript and confirm the production preview build succeeds.
- Verify adult, teen, child, and Learn experiences in Arabic and English, light and dark modes, at mobile and desktop widths.
- Confirm visible charts, hover/tap values, keyboard focus, goals, savings, budgets, games, challenges, badges, and illustrations.
- Confirm no overflow, console errors, lost functionality, hidden important visuals, or backend changes.
