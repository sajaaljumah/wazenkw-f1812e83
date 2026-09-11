# Wazen complete UX/UI redesign

## Direction
Recompose Wazen as a calm, premium personal-finance journey built around **Understand → Plan → Spend → Save → Give → Grow**. Keep the current red-led Wazen identity, exact logo assets, real data, calculations, routes, permissions, and actions. Replace equal-weight card stacks with one clear focal point, editorial sections, ruled lists, progressive disclosure, and restrained moments of personality.

## Scope and guardrails
- Redesign all existing public, account, dashboard, learning, planning, activity, recurring, document, asset, Zakat, family, profile, settings, and subscription experiences.
- Preserve all backend tables, RLS, authentication, hooks, calculations, writes, subscriptions, family permissions, Zakat methodology, stored data, and future API boundaries.
- Do not add APIs, keys, integrations, routes, financial modules, fake values, or gender-specific dashboards.
- Keep Arabic as default, complete Arabic/English parity, RTL/LTR behavior, light/dark themes, and the supplied logos unchanged.

## Implementation

### 1. Shared visual and interaction system
- Refine semantic tokens for quieter surfaces, clearer type hierarchy, restrained elevation, life-stage accents, focus states, and dark-mode contrast.
- Introduce focused reusable presentation patterns: page masthead, insight strip, journey section, compact metric rail, ruled activity row, disclosure section, and milestone feedback.
- Reduce generic cards and nested cards. Reserve elevated containers for the single primary story, repeated records, dialogs, and meaningful tools.
- Keep motion purposeful: progress fills, section entry, successful actions, challenge completion, and earned milestones only; preserve reduced-motion behavior.

### 2. Global frame and navigation
- Simplify the application header and mobile navigation while preserving every current destination and life-stage visibility rule.
- Strengthen active states, touch targets, RTL mirroring, tablet navigation, and account controls.
- Keep Profile and Subscription within Settings; do not add bottom-navigation items.

### 3. First-time walkthrough
- Add a lightweight, accessible 4-step walkthrough after setup: Welcome, Understand, Plan & Save, and Make Money Work.
- Personalize copy and relevant destinations for Child, Teen, University, Employee, Self-employed, and Parent accounts.
- Include Back, Next, Skip, and Finish with keyboard/focus support and mobile-safe composition.
- Mark only newly created accounts as walkthrough-eligible in existing authenticated user metadata; legacy and demo accounts remain untouched. Persist completion/skip to that same account metadata so it survives refresh and sign-in without leaking between accounts.

### 4. Financial home dashboards
- Reorder every dashboard around greeting/date, available money, one truthful data-derived insight, Spend/Save/Give actions, planning progress, upcoming items, recent activity, then optional analytics.
- Convert six equal quick actions into three prominent actions—Spend for Yourself, Save for Your Future, Give for Others—with Income, Budget, and Goal available through a compact secondary control. Preserve the existing action dialogs and writes.
- Combine overlapping budget/category/activity signals into focused modules and place secondary charts behind tabs or accessible disclosure controls.
- University emphasizes allowance/support, budget, goals, and commitments. Teen uses a mature mission-led hierarchy. Employee and Self-employed share a premium adult system with context appropriate to stable or irregular income.
- Parent clearly separates **My Finances** from **Family**, showing a compact family summary before member and parent-paid detail.

### 5. Child and Learn journeys
- Make the child goal the emotional dashboard anchor, followed by simple Spend/Save/Give choices and one concise money snapshot.
- Move activity, family-paid items, and badges into compact secondary views without removing them.
- Recompose Learn around the recommended next activity and a visible learning path; group lessons, games, quizzes, challenges, and achievements into journey stages using all existing progress and gameplay logic.
- Preserve every current game, quiz, challenge, badge, illustration, reward calculation, and child money action. Keep the shared gender-neutral system and no pig imagery.

### 6. Planning, activity, and analytics
- Present Budget, Emergency Fund, Savings, and Goals as one connected planning story on the dashboard, with the most important status visible and details expandable.
- Make transactions scan-first: merchant/source, date/category, and amount/currency lead; secondary context remains available without crowding each row.
- Show one useful chart or answer first. Keep category, monthly comparison, savings trend, and portfolio data available through focused tabs/disclosures rather than simultaneous full-size charts.
- Use human, data-safe language for empty states and progress, without invented claims.

### 7. Supporting screens
- **Recurring:** lead with the monthly commitment picture; group due-soon and later items; retain add/edit/pause/delete.
- **Documents:** present upload as a clear step flow and reduce competition from document history; preserve honest non-AI messaging and every existing state.
- **Assets:** make portfolio value and overall trend primary; collapse per-asset valuation history until requested; preserve CRUD and calculations.
- **Zakat:** lead with due status, amount, and next action; move Hawl, calculation breakdown, explanation, and histories into clear disclosures; preserve official methodology and reference.
- **Settings/Profile/Subscription:** use compact grouped account, preferences, security, and plan sections with progressive disclosure; preserve all saves and subscription behavior.
- **Public/Auth/Onboarding/Recovery:** align hierarchy and personality with the product while preserving every field, validation, demo flow, theme/language behavior, and route.

### 8. Localization, accessibility, and metadata
- Add natural Arabic and English copy for all new labels, insights, disclosures, empty states, and walkthrough steps.
- Verify logical alignment, mirrored direction cues, structural amount formatting, focus movement, visible focus, touch targets, contrast, labels, and reduced motion.
- Ensure every content route retains unique title, description, Open Graph text, type, and Twitter card metadata.

## Verification
- Check public and authenticated flows for Child, Teen, University, Employee, Self-employed, and Parent accounts.
- Inspect Dashboard, walkthrough, Learn/game/quiz/challenge flows, money actions, planning, transactions, recurring, documents, assets, Zakat/Give, family, profile, settings, and subscription.
- Verify Arabic RTL and English LTR, light and dark modes, and widths 320, 375, 768, 1280, and 1600.
- Confirm no overlap, overflow, clipped labels, dead controls, untranslated interface copy, pig imagery, gender-based visual branching, duplicated navigation, broken charts, or redesign-caused console errors.
- Run targeted interaction checks, TypeScript validation, and the production build. Report the requested ten-item PASS/FAIL handoff summary and any real remaining limitation.
