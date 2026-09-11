# Make scroll reveals visibly work in preview

## Goal
Make the existing Dashboard content visibly fade upward as each section enters the viewport, then reuse the proven behavior for existing cards, charts, and progress bars without changing layout, data, or functionality.

## Implementation
- Strengthen the shared reveal hook so it observes the actual scroll container, starts elements hidden before paint, and reveals each element only after a genuine viewport intersection.
- Increase the existing transition to a clearly perceptible 500–700ms fade plus upward movement, with small purposeful staggering for grouped content.
- First connect and verify one below-fold Dashboard section in the running preview using measured opacity and transform values before and during scrolling.
- Apply the same verified mechanism to the remaining existing Dashboard, Teen, Child, and Learn sections already wired for reveal.
- Keep chart mounting and progress-fill animation tied to first visibility so they animate only when scrolled into view.
- Preserve immediate visibility only when the browser truly reports `prefers-reduced-motion: reduce`.

## Verification
- Use the live preview with a normal-motion browser and controlled scrolling.
- Capture before/during/after states for a below-fold Dashboard section and confirm opacity changes from 0 to 1 while translateY moves to 0 over the expected duration.
- Check adult, teen, child, and Learn pages for scroll-triggered sections, charts, and progress bars.
- Confirm reduced-motion behavior, no hidden content after reveal, no overflow, no console errors, and a healthy build.
