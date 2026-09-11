import { useId } from "react";
import { cn } from "@/lib/utils";
import { firstNameOf, type Gender, type LifeStage } from "@/lib/wazen";

/**
 * Wazen avatar system — modern, flat-vector portraits.
 *
 * Built from clean geometry (soft shoulders, simplified hair silhouettes,
 * duotone garments) with a layered plate, inner rim light and a soft ground
 * shadow so the portrait reads dimensional rather than like a clipart face.
 * Palettes are life-stage and gender aware and drawn from design tokens.
 */

type Palette = {
  /** Outer plate gradient. */
  plateFrom: string;
  plateTo: string;
  /** Garment gradient. */
  garmentFrom: string;
  garmentTo: string;
  hair: string;
  detail: string;
};

const SKIN = "var(--avatar-skin)";
const SKIN_SHADE = "color-mix(in oklab, var(--avatar-skin) 82%, var(--avatar-hair))";
const HAIR = "var(--avatar-hair)";

function paletteFor(lifeStage: LifeStage, gender: Gender): Palette {
  const female = gender === "female";
  switch (lifeStage) {
    case "child":
      return female
        ? {
            plateFrom: "oklch(0.965 0.028 8)",
            plateTo: "oklch(0.915 0.052 12)",
            garmentFrom: "oklch(0.84 0.075 10)",
            garmentTo: "oklch(0.74 0.09 12)",
            hair: HAIR,
            detail: "oklch(0.97 0.02 90)",
          }
        : {
            plateFrom: "oklch(0.962 0.026 236)",
            plateTo: "oklch(0.908 0.05 238)",
            garmentFrom: "oklch(0.82 0.07 240)",
            garmentTo: "oklch(0.7 0.085 245)",
            hair: HAIR,
            detail: "oklch(0.97 0.02 90)",
          };
    case "teenager":
      return female
        ? {
            plateFrom: "oklch(0.945 0.03 12)",
            plateTo: "oklch(0.875 0.045 340)",
            garmentFrom: "oklch(0.7 0.075 350)",
            garmentTo: "oklch(0.56 0.08 345)",
            hair: HAIR,
            detail: "oklch(0.93 0.03 340)",
          }
        : {
            plateFrom: "oklch(0.938 0.022 240)",
            plateTo: "oklch(0.862 0.032 210)",
            garmentFrom: "oklch(0.62 0.045 240)",
            garmentTo: "oklch(0.47 0.05 245)",
            hair: HAIR,
            detail: "oklch(0.9 0.03 165)",
          };
    case "university_student":
      return female
        ? {
            plateFrom: "oklch(0.955 0.018 70)",
            plateTo: "oklch(0.885 0.03 40)",
            garmentFrom: "oklch(0.6 0.06 300)",
            garmentTo: "oklch(0.44 0.06 295)",
            hair: HAIR,
            detail: "oklch(0.92 0.028 80)",
          }
        : {
            plateFrom: "oklch(0.952 0.016 80)",
            plateTo: "oklch(0.878 0.024 55)",
            garmentFrom: "oklch(0.52 0.03 250)",
            garmentTo: "oklch(0.38 0.03 255)",
            hair: HAIR,
            detail: "oklch(0.92 0.028 80)",
          };
    default:
      // Employee, self-employed and parent — elegant, tailored, restrained.
      return female
        ? {
            plateFrom: "oklch(0.948 0.014 60)",
            plateTo: "oklch(0.872 0.02 35)",
            garmentFrom: "oklch(0.42 0.045 20)",
            garmentTo: "oklch(0.3 0.04 22)",
            hair: HAIR,
            detail: "oklch(0.9 0.035 85)",
          }
        : {
            plateFrom: "oklch(0.944 0.012 70)",
            plateTo: "oklch(0.866 0.018 45)",
            garmentFrom: "oklch(0.34 0.018 250)",
            garmentTo: "oklch(0.24 0.014 255)",
            hair: HAIR,
            detail: "oklch(0.9 0.035 85)",
          };
  }
}

/** Simplified hair silhouettes — one clean shape per stage/gender. */
function Hair({ lifeStage, gender, color }: { lifeStage: LifeStage; gender: Gender; color: string }) {
  if (gender === "female") {
    if (lifeStage === "child") {
      return (
        <>
          <path d="M30 43c0-11 8-18 18-18s18 7 18 18c0 4-2 6-4 6H34c-2 0-4-2-4-6Z" fill={color} />
          <path d="M27 46a6.5 6.5 0 1 1 8-6.3Z" fill={color} />
          <path d="M69 46a6.5 6.5 0 1 0-8-6.3Z" fill={color} />
        </>
      );
    }
    if (lifeStage === "teenager") {
      return (
        <path d="M28 46c0-13 9-21 20-21s20 8 20 21v17c0 4-3 6-6 4V44c-4-3-8-4-14-4s-10 1-14 4v23c-3 2-6 0-6-4Z" fill={color} />
      );
    }
    return (
      <path d="M29 45c0-12 8-20 19-20s19 8 19 20v10c0 4-3 5-5 3V44c-4-3-8-4-14-4s-10 1-14 4v14c-2 2-5 1-5-3Z" fill={color} />
    );
  }
  if (lifeStage === "child") {
    return <path d="M31 42c1-10 8-16 17-16s16 6 17 16c-4-5-9-7-17-7s-13 2-17 7Z" fill={color} />;
  }
  if (lifeStage === "teenager") {
    return <path d="M31 43c0-11 7-18 17-18s17 7 17 18c-3-7-9-10-17-10-5 0-9 1-12 3l-5 7Z" fill={color} />;
  }
  return <path d="M32 42c0-10 7-17 16-17s16 7 16 17c-4-6-9-9-16-9s-12 3-16 9Z" fill={color} />;
}

export function WazenAvatar({
  fullName,
  gender,
  lifeStage,
  avatarUrl,
  size = 56,
  className,
}: {
  fullName: string;
  gender: Gender;
  lifeStage: LifeStage;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const name = firstNameOf(fullName);
  const palette = paletteFor(lifeStage, gender);
  const uid = useId().replace(/[:]/g, "");

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name}'s profile photo`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full border border-border object-cover", className)}
      />
    );
  }

  const child = lifeStage === "child";
  const young = child || lifeStage === "teenager";
  const headR = child ? 18 : 16;
  const headY = child ? 45 : 44;
  const shoulderTop = child ? 70 : 66;

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name}'s avatar`}
      className={cn("shrink-0 rounded-full", className)}
    >
      <defs>
        <linearGradient id={`plate-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={palette.plateFrom} />
          <stop offset="100%" stopColor={palette.plateTo} />
        </linearGradient>
        <linearGradient id={`garment-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={palette.garmentFrom} />
          <stop offset="100%" stopColor={palette.garmentTo} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="0.3" cy="0.22" r="0.75">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${uid})`}>
        <circle cx="48" cy="48" r="48" fill={`url(#plate-${uid})`} />
        <circle cx="48" cy="48" r="48" fill={`url(#glow-${uid})`} />

        {/* Ground shadow under the shoulders adds depth. */}
        <ellipse cx="48" cy={shoulderTop + 6} rx="34" ry="10" fill="oklch(0.25 0.01 30)" opacity="0.1" />

        {/* Shoulders / garment */}
        <path
          d={`M8 96c0-${child ? 17 : 19} 18-${96 - shoulderTop} 40-${96 - shoulderTop}s40 ${96 - shoulderTop - (child ? 17 : 19)} 40 ${96 - shoulderTop}Z`}
          fill={`url(#garment-${uid})`}
        />
        {/* Collar / neckline detail keeps adults tailored, kids soft. */}
        {young ? (
          <path
            d={`M${48 - 11} ${shoulderTop + 1}q11 ${child ? 9 : 8} 22 0`}
            stroke={palette.detail}
            strokeOpacity="0.55"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <>
            <path d={`M40 ${shoulderTop + 1}L48 ${shoulderTop + 15} 56 ${shoulderTop + 1}`} fill="white" fillOpacity="0.9" />
            <path
              d={`M48 ${shoulderTop + 7}l4 4-4 12-4-12Z`}
              fill={palette.detail}
              opacity={gender === "female" ? 0 : 0.95}
            />
          </>
        )}

        {/* Neck */}
        <rect x="43" y={headY + headR - 5} width="10" height="12" rx="5" fill={SKIN_SHADE} />

        {/* Head */}
        <circle cx="48" cy={headY} r={headR} fill={SKIN} />
        {/* Soft side shade for dimension */}
        <path
          d={`M48 ${headY - headR}a${headR} ${headR} 0 0 1 0 ${headR * 2}Z`}
          fill="oklch(0.35 0.02 45)"
          opacity="0.07"
        />

        <Hair lifeStage={lifeStage} gender={gender} color={palette.hair} />

        {/* Minimal facial marks — a quiet, modern look. */}
        <circle cx={48 - (child ? 6.5 : 5.5)} cy={headY + 1.5} r={child ? 1.9 : 1.5} fill={HAIR} />
        <circle cx={48 + (child ? 6.5 : 5.5)} cy={headY + 1.5} r={child ? 1.9 : 1.5} fill={HAIR} />
        <path
          d={
            young
              ? `M${48 - 5} ${headY + 8}q5 ${child ? 4.5 : 3.5} 10 0`
              : `M${48 - 3.5} ${headY + 8}h7`
          }
          stroke={HAIR}
          strokeOpacity={young ? 0.7 : 0.45}
          strokeWidth={young ? 2 : 1.6}
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner rim light */}
        <circle cx="48" cy="48" r="47" fill="none" stroke="white" strokeOpacity="0.35" />
      </g>
      <circle cx="48" cy="48" r="47.5" fill="none" stroke="oklch(0.25 0.01 30)" strokeOpacity="0.1" />
    </svg>
  );
}
