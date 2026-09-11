# Refine Wazen’s personality without adding clutter

## Goal
Keep the redesigned hierarchy and generous spacing, while making Wazen feel more human, distinctive, and engaging through existing content and interactions only.

## Changes
- Strengthen the adult and teen dashboard narrative with contextual section cues, clearer relationships between available money, next actions, planning, and recent activity.
- Refine Wazen’s visual language through restrained red accents, progress emphasis, better section transitions, and purposeful open/pressed/completed states rather than decorative graphics.
- Preserve the child dashboard’s goal, savings, badges, and illustrations while improving the story from goal → action → progress and keeping secondary history disclosed.
- Refine Learn as a guided journey: keep recommendations and lessons prominent, preserve games/challenges/badges, and make completion and progress states more meaningful without adding content or mechanics.
- Improve existing empty, success, loading, and disclosure states where needed, using natural Arabic and English copy already tied to real user data.
- Keep the account-scoped first-use walkthrough unchanged in behavior and ensure it remains clear in Arabic, English, light, dark, mobile, and desktop layouts.

## Boundaries
- No backend, database, authentication, subscription, financial calculation, API, or Anti-Gravity architecture changes.
- No new features, random illustrations, decorative graphics, broad animation, clickable decoration, or additional dashboard cards.
- Preserve every existing action, route, visual used by Goals/Savings/Learn/Games/Challenges/Badges/Child, and the current reduced-information layout.

## Verification
- Check TypeScript and the production preview build.
- Verify adult, teen, child, and Learn presentation in Arabic/English, light/dark, and phone/desktop widths.
- Confirm no overflow, inaccessible controls, console errors, lost functionality, or reintroduced information stacking.
