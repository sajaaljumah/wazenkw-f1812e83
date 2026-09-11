import darkLogo from "@/assets/wazen-logo-dark.png.asset.json";
import lightLogo from "@/assets/wazen-logo-light.png.asset.json";
import { cn } from "@/lib/utils";

/** Intrinsic size of both source artworks (they share the same canvas). */
const SRC_W = 1920;
const SRC_H = 1279;
const ASPECT_RATIO = SRC_W / SRC_H;

/**
 * The official Wazen lockup. Two finalised files are supplied — the dark
 * wordmark for light mode and the white wordmark for dark mode — and both are
 * used exactly as delivered: transparent, never recoloured, never plated.
 */
export function WazenLogo({
  size = 40,
  className,
}: {
  /** Rendered height in px. */
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ height: size, width: size * ASPECT_RATIO }}
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
          className={cn("absolute inset-0 size-full object-contain", visibility)}
          loading="eager"
          decoding="async"
        />
      ))}
    </span>
  );
}
