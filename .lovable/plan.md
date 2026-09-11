# Fix landing logos and theme control

## Changes
- Render both finalized logo files at their complete intrinsic aspect ratio, with no manual crop, stretch, recoloring, or background.
- Continue switching automatically between the black-wordmark logo in Light Mode and white-wordmark logo in Dark Mode.
- Add the existing Light/Dark control to the Landing Page header.
- Remove that control from both Login and Create Account views, while preserving the selected guest theme across navigation and sign-in.

## Verification
- Check Landing, Login, and Create Account in both themes at mobile and desktop widths.
- Confirm the full artwork remains visible, layout does not overflow, theme choice persists, and the app build stays clean.
