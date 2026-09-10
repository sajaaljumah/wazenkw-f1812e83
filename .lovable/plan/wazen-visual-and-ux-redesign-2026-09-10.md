# Wazen visual and UX redesign

## Direction
Create a warm editorial fintech experience: structured like a refined personal ledger, with purposeful hierarchy, restrained surfaces, precise data presentation, and subtle tactile interaction. Preserve the distinct illustrated child experience while giving teen, university, and adult users progressively more mature visual identities.

## Scope
- Redesign every existing screen: home, sign-in/sign-up, password recovery, onboarding, dashboard variants, profile, settings, subscription, dialogs, and global error/empty/loading states.
- Preserve all current routes, live data, authentication, permissions, family relationships, calculations, demo accounts, and subscription rules.
- Do not create mock versions of Income, Expenses, Analytics, Investments, Zakat, AI, or other modules that do not currently exist.

## Build approach
1. **Design system**
   - Rework semantic color, typography, spacing, radius, border, elevation, focus, motion, form, button, and status tokens.
   - Use warm ivory, charcoal, sage, olive, taupe, and champagne for adults; define distinct teen and university themes; retain refined pink/blue child palettes.
   - Replace excessive pills and identical rounded cards with editorial sections, ruled rows, inset data surfaces, and a small set of purposeful containers.

2. **Global application frame**
   - Redesign desktop navigation into a compact, structured application header with clear active states and profile controls.
   - Simplify mobile navigation and preserve reachable primary destinations.
   - Apply profile-selected language and direction globally; keep the language-aware footer unchanged in meaning.

3. **Dashboard hierarchy**
   - Build a compact personalized masthead, dominant available-money overview, integrated primary actions, financial progress, charts, activity, upcoming cash flow, and family summary.
   - Keep every number sourced from current backend data and every existing write action functional.
   - Give teen and university dashboards their own palette, density, and content emphasis instead of simple recoloring.

4. **Public, account, and setup screens**
   - Give the home and account screens stronger Wazen identity with confident editorial composition rather than generic feature cards.
   - Standardize inputs, buttons, validation, progress steps, locked fields, and confirmation states.
   - Improve profile, settings, and subscription information hierarchy without changing their logic.

5. **Child experience**
   - Preserve the existing illustrations, real goals, Save/Spend/Give actions, badges, and celebrations.
   - Refine composition, typography, spacing, and interaction so it remains playful luxury rather than an adult dashboard or kindergarten interface.

6. **Language and accessibility**
   - Add a lightweight English/Arabic presentation layer for every existing interface string.
   - Apply RTL direction, Arabic-capable typography, logical alignment, mirrored directional affordances, and locale-aware dates/numbers.
   - Keep displayed user names to the appropriate first name only.

7. **Verification**
   - Check all public and authenticated routes at desktop and mobile sizes.
   - Verify representative child, teen, university, adult, parent, free, and premium states with existing demo accounts.
   - Run TypeScript checks and the production build, then resolve redesign-related errors only.

## Technical details
- Continue using TanStack Start, the existing backend client, React Query, Recharts, Lucide, and existing dialogs/toasts.
- Keep localization frontend-only and driven by the existing profile language field; no database or API changes.
- Keep styling token-based in `src/styles.css`; no hardcoded component colors or remote CSS imports.
- Refactor repeated presentation patterns into focused Wazen UI components while leaving business logic and data hooks untouched.
