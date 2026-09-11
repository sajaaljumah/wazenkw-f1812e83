# Make Wazen’s existing financial experience more interactive

## Goal
Apply Eng. Moslem’s feedback without another redesign: preserve Wazen’s current hierarchy, visuals, illustrations, content, and functionality while making existing financial progress and learning interactions feel more useful, responsive, and alive.

## Changes
- Keep the adult and teen dashboard analytics visible by default instead of hiding the existing spending, income-versus-expenses, and savings charts behind a closed section.
- Preserve every current chart and its real-data calculations, while improving hover, keyboard, and tap feedback so exact values, series names, trends, and comparisons are easier to understand.
- Refine the existing spending-category bars so pointer or keyboard focus reveals their exact amount and share without adding a new data view.
- Improve existing goal, savings, budget, emergency-fund, family-goal, child-goal, and Learn progress feedback with accessible values, restrained value-linked transitions, and clear completed states.
- Keep the Child and Learn illustrations fully visible. Preserve games, challenges, badges, goals, and savings visuals, while refining their existing pressed, selected, correct, completed, earned, and locked states only where useful.
- Preserve progressive disclosure for genuinely secondary details, but do not collapse important charts, illustrations, or primary progress content by default.

## Boundaries
- Frontend presentation and interaction changes only.
- No new features, charts, content, graphics, filters, financial logic, routes, APIs, database work, authentication changes, subscription changes, or Anti-Gravity changes.
- No random animation, decorative interaction, clickable decoration, or broad redesign.
- Preserve Arabic/English, RTL/LTR, light/dark themes, responsiveness, accessibility, and reduced-motion behavior.

## Technical details
- Reuse Recharts’ existing tooltip and active-state APIs; use the current transaction series and semantic theme tokens.
- Make current progress bars expose complete ARIA progress semantics and animate only when their data value changes.
- Use existing Wazen interaction classes and semantic colors; add only restrained states tied to real financial or learning status.

## Verification
- Run TypeScript and the production preview build.
- Verify adult, teen, child, and Learn experiences in Arabic and English, light and dark modes, at phone and desktop widths.
- Confirm chart hover/tap values, category focus states, goal/savings progress, games/challenges/badges, illustrations, and reduced-motion behavior.
- Confirm no overflow, console errors, lost functionality, hidden important visuals, or backend changes.
