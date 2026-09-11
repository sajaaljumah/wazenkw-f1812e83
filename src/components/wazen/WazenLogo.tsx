import darkLogo from "@/assets/wazen-logo-dark.png.asset.json";
import lightLogo from "@/assets/wazen-logo-light.png.asset.json";
import { cn } from "@/lib/utils";

/** Intrinsic size of both source artworks (they share the same canvas). */
const SRC_W = 1920;
const SRC_H = 1279;
/** Bounding box of the red "W" mark inside the artwork. */
const MARK = { x: 298, y: 199, w: 1416, h: 643 };
/** Visible bounds of the full lockup (mark + wordmark). */
const FULL = { x: 253, y: 199, w: 1461, h: 951 };

/**
 * The official Wazen lockup. Two finalised files are supplied — the dark
 * wordmark for light mode and the white wordmark for dark mode — and both are
 * used exactly as delivered: transparent, never recoloured, never plated.
 */
export function WazenLogo({
  size = 40,
  className,
  withWordmark = true,
}: {
  /** Rendered height in px. */
  size?: number;
  className?: string;
  /** Crop to the "W" mark only when false. */
  withWordmark?: boolean;
}) {
  const box = withWordmark ? FULL : MARK;
  const scale = size / box.h;

  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden", className)}
      style={{ height: size, width: box.w * scale }}
      role="img"
      aria-label="Wazen"
    >
      {([
        [lightLogo.url, "dark:hidden"],
        [darkLogo.url, "hidden dark:block"],
      ] as const).map(([url, visibility]) => (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden
          width={SRC_W}
          height={SRC_H}
          className={cn("absolute", visibility)}
          style={{
            width: SRC_W * scale,
            height: SRC_H * scale,
            left: -box.x * scale,
            top: -box.y * scale,
          }}
          loading="eager"
          decoding="async"
        />
      ))}
    </span>
  );
}
