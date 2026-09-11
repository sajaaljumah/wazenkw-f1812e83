import logo from "@/assets/wazen-logo.png.asset.json";
import { cn } from "@/lib/utils";

/** Intrinsic size of the source artwork. */
const SRC_W = 1774;
const SRC_H = 887;
/** Bounding box of the red "W" mark inside the artwork. */
const MARK = { x: 420, y: 130, w: 995, h: 460 };

/**
 * The official Wazen lockup (red "W" mark above the Wazen wordmark).
 * The source artwork sits on white, so it is blended into the surrounding
 * light surface with `mix-blend-multiply` instead of being redrawn.
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
  if (withWordmark) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ height: size, width: (size * SRC_W) / SRC_H }}
      >
        <img
          src={logo.url}
          alt="Wazen"
          width={SRC_W}
          height={SRC_H}
          className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  // Crop to the mark: scale the full artwork, then shift the crop into view.
  const scale = size / MARK.h;
  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden", className)}
      style={{ height: size, width: MARK.w * scale }}
    >
      <img
        src={logo.url}
        alt="Wazen"
        width={SRC_W}
        height={SRC_H}
        className="absolute mix-blend-multiply dark:mix-blend-normal"
        style={{
          width: SRC_W * scale,
          height: SRC_H * scale,
          left: -MARK.x * scale,
          top: -MARK.y * scale,
        }}
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
