import logo from "@/assets/wazen-logo.png.asset.json";
import { cn } from "@/lib/utils";

/** Intrinsic size of the source artwork. */
const SRC_W = 1774;
const SRC_H = 887;
/** Bounding box of the red "W" mark inside the artwork. */
const MARK = { x: 420, y: 130, w: 995, h: 460 };

/** The untouched red "W" mark, cropped out of the original artwork. */
function Mark({ size, className }: { size: number; className?: string }) {
  const scale = size / MARK.h;
  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden", className)}
      style={{ height: size, width: MARK.w * scale }}
    >
      <img
        src={logo.url}
        alt=""
        aria-hidden
        width={SRC_W}
        height={SRC_H}
        className="absolute"
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

/**
 * The official Wazen lockup: the red "W" mark above the "Wazen" wordmark.
 * The mark artwork is never redrawn or recoloured. On dark surfaces the logo
 * sits directly on the background (no plate) and the wordmark is set in white.
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
  if (!withWordmark) {
    return <Mark size={size} className={className} />;
  }

  const markSize = size * 0.56;
  const wordSize = size * 0.3;

  return (
    <span
      className={cn("inline-flex shrink-0 flex-col items-center justify-center", className)}
      style={{ height: size, gap: size * 0.06 }}
      aria-label="Wazen"
      role="img"
    >
      <Mark size={markSize} />
      <span
        className="font-display font-semibold leading-none text-foreground"
        style={{ fontSize: wordSize, letterSpacing: wordSize * 0.02 }}
      >
        Wazen
      </span>
    </span>
  );
}
