# Wazen responsive UI and demo-data correction

## Goal
Deliver a polished, banking-grade Wazen experience that reflows cleanly from 320px to wide desktop, keeps one shared visual treatment per life stage, and gives every demo experience realistic populated financial activity.

## Implementation

### 1. Responsive application shell
- Rework the signed-in header into a compact desktop navigation with a controlled tablet state, preventing labels, plan status, notifications, avatar, and sign-out controls from colliding.
- Make mobile navigation safe for long Arabic labels, narrow screens, and device safe areas; reserve enough page space so content is never hidden behind it.
- Apply consistent `min-width: 0`, wrapping, truncation, and full-width field rules to headers, dialogs, forms, lists, and action rows.

### 2. Dashboard hierarchy and life-stage consistency
- Keep the existing child, teenager, university, employee/self-employed, and parent functionality, calculations, queries, and actions.
- Remove gender-driven dashboard styling. Child visuals will use one restrained ivory, charcoal, champagne, and red system for every child account.
- Replace the current illustrated portrait fallback with a premium geometric identity mark whose variation is based only on life stage and name, never gender.
- Strengthen the available-money hierarchy and make supporting figures, action groups, goals, rewards, family-paid items, and recent activity reflow cleanly at every width.
- Preserve working Spend, Save, Give, Receive, budget, goal, family, asset, and Zakat interactions.

### 3. Charts and financial content
- Make dashboard and asset charts adapt their axis density, margins, labels, tooltips, and heights to narrow phones, tablets, and desktops.
- Keep real stored data as the source; retain empty states only where a genuinely new user has no records.
- Keep Sadaqah and Zakat visually and semantically separate across activity and Zakat history.

### 4. Assets, Zakat, and secondary screens
- Correct cramped asset statistics, long asset names, action controls, valuation history, and monetary rows at 320px.
- Correct Zakat title/actions, Hawl controls, breakdown rows, payment history, and notification surfaces for narrow RTL and LTR layouts.
- Audit authentication, onboarding, profile, settings, subscription, password recovery, dialogs, and public pages for overflow, clipped text, inaccessible controls, and mobile spacing without redesigning their functionality.

### 5. Demo experience cleanup
- Keep all 12 real demo accounts and their relationships intact, but simplify the sign-in demo picker to one representative for each requested experience: child, teenager, university student, employee, self-employed, and parent.
- Add narrowly scoped seed data for missing Sadaqah/Give activity and adult Zakat calculation/payment history, using current-date-relative realistic records.
- Preserve the existing two-year transaction, budget, savings, goal, emergency-fund, upcoming-payment, family, asset, and subscription histories.
- Do not derive plan status or visuals from gender, and do not change backend architecture or security rules.

## Technical details
- Use existing semantic design tokens and the selected Sora/Manrope typography direction; no hardcoded component colors.
- Keep Arabic as default, preserve English in Settings, and validate correct RTL/LTR ordering and financial-number readability.
- Use one migration only for the requested missing demo records; no new tables, APIs, integrations, or financial modules.
- Preserve route structure, authentication, subscriptions, family permissions, calculations, and all existing data writes.

## Verification
- Run TypeScript and the production build, fixing only regressions from this pass.
- Visually inspect representative child, teen, university, adult, self-employed, and parent dashboards at 320, 375, 768, 1024, 1280, and wide desktop widths.
- Verify Arabic RTL and English LTR, navigation, charts, dialogs, Assets, Zakat, Profile, Settings, Subscription, Auth, and onboarding.
- Confirm no overlap, horizontal overflow, hidden bottom content, pig imagery, gender-based presentation, broken interactions, console errors, or failed requests.
