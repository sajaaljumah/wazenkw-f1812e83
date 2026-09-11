import { useId } from "react";
import { cn } from "@/lib/utils";
import { firstNameOf, type Gender, type LifeStage } from "@/lib/wazen";

type StagePalette = {
  plate: string;
  field: string;
  accent: string;
};

function paletteFor(lifeStage: LifeStage): StagePalette {
  switch (lifeStage) {
    case "child":
      return { plate: "var(--avatar-child-plate)", field: "var(--avatar-child-field)", accent: "var(--avatar-child-accent)" };
    case "teenager":
      return { plate: "var(--avatar-teen-plate)", field: "var(--avatar-teen-field)", accent: "var(--avatar-teen-accent)" };
    case "university_student":
      return { plate: "var(--avatar-student-plate)", field: "var(--avatar-student-field)", accent: "var(--avatar-student-accent)" };
    default:
      return { plate: "var(--avatar-adult-plate)", field: "var(--avatar-adult-field)", accent: "var(--avatar-adult-accent)" };
  }
}

/**
 * A gender-neutral identity seal. The geometry changes by life stage while the
 * monogram keeps each account recognizable without using cartoon portraits.
 */
export function WazenAvatar({
  fullName,
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
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "W";
  const palette = paletteFor(lifeStage);
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
  const teen = lifeStage === "teenager";

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
        <linearGradient id={`avatar-field-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.field} />
          <stop offset="100%" stopColor={palette.plate} />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="47" fill={`url(#avatar-field-${uid})`} stroke={palette.plate} strokeWidth="2" />
      <circle cx="48" cy="48" r={child ? 33 : teen ? 32 : 31} fill="none" stroke={palette.accent} strokeWidth="1.5" opacity="0.75" />
      {child ? (
        <>
          <circle cx="48" cy="14" r="3" fill={palette.accent} />
          <circle cx="82" cy="48" r="3" fill={palette.accent} />
          <circle cx="48" cy="82" r="3" fill={palette.accent} />
          <circle cx="14" cy="48" r="3" fill={palette.accent} />
        </>
      ) : teen ? (
        <path d="M24 69 48 21l24 48Z" fill="none" stroke={palette.accent} strokeWidth="1.5" opacity="0.45" />
      ) : (
        <path d="M22 48h52M48 22v52" stroke={palette.accent} strokeWidth="1" opacity="0.24" />
      )}
      <text
        x="48"
        y="51"
        dominantBaseline="middle"
        textAnchor="middle"
        fill={palette.accent}
        fontFamily="var(--font-display)"
        fontSize={child ? 31 : 29}
        fontWeight="700"
      >
        {initial}
      </text>
    </svg>
  );
}