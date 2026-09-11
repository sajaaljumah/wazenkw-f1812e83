import logo from "@/assets/wazen-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * The official Wazen lockup (Arabic + Latin wordmark under the red arcs).
 * The source artwork sits on white, so it is blended into the surrounding
 * ivory surface with `mix-blend-multiply` instead of being redrawn.
 */
export function WazenLogo({
  size = 40,
  className,
  withWordmark = true,
}: {
  /** Rendered height in px. */
  size?: number;
  className?: string;
  /** Crop to the arc mark only when false. */
  withWordmark?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-center justify-center overflow-hidden", className)}
      style={{ height: size, width: withWordmark ? size * 1.62 : size * 0.9 }}
    >
      <img
        src={logo.url}
        alt="Wazen"
        className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
        style={withWordmark ? undefined : { objectPosition: "center top", transform: "scale(1.6)" }}
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
