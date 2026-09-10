import { cn } from "@/lib/utils";
import { firstNameOf, type Gender, type LifeStage } from "@/lib/wazen";

/**
 * Default Wazen avatars.
 * Every account always has an illustration: it is derived from the life stage
 * and gender, so the avatar area is never empty. Illustrations mature with the
 * life stage (playful for children, elegant and abstract for adults) and use
 * the Luxury Minimal palette tokens defined in styles.css.
 */

type Palette = {
  bg: string;
  hair: string;
  garment: string;
  accent: string;
};

const SKIN = "var(--avatar-skin)";
const HAIR = "var(--avatar-hair)";

function paletteFor(lifeStage: LifeStage, gender: Gender): Palette {
  switch (lifeStage) {
    case "child":
      return gender === "female"
        ? { bg: "var(--avatar-pastel-pink)", hair: HAIR, garment: "var(--avatar-rose)", accent: "var(--avatar-rose)" }
        : { bg: "var(--avatar-pastel-blue)", hair: HAIR, garment: "var(--avatar-blue)", accent: "var(--avatar-blue)" };
    case "teenager":
      return gender === "female"
        ? { bg: "var(--avatar-rose)", hair: HAIR, garment: "var(--avatar-lavender)", accent: "var(--avatar-lavender)" }
        : { bg: "var(--avatar-blue)", hair: HAIR, garment: "var(--avatar-sage)", accent: "var(--avatar-slate)" };
    case "university_student":
      return {
        bg: "var(--avatar-champagne)",
        hair: HAIR,
        garment: gender === "female" ? "var(--avatar-lavender)" : "var(--avatar-slate)",
        accent: "var(--avatar-taupe)",
      };
    default:
      return {
        bg: "var(--avatar-taupe)",
        hair: HAIR,
        garment: "var(--avatar-garment-dark)",
        accent: "var(--avatar-champagne)",
      };
  }
}

function ChildFace({ palette, gender }: { palette: Palette; gender: Gender }) {
  return (
    <>
      <path d="M18 96c0-16 13-26 30-26s30 10 30 26Z" fill={palette.garment} />
      <circle cx="48" cy="42" r="21" fill={SKIN} />
      <path d="M27 38a21 21 0 0 1 42 0c-6-8-14-11-21-11s-15 3-21 11Z" fill={palette.hair} />
      {gender === "female" ? (
        <>
          <circle cx="24" cy="40" r="6" fill={palette.hair} />
          <circle cx="72" cy="40" r="6" fill={palette.hair} />
          <circle cx="74" cy="27" r="4.5" fill={palette.accent} />
        </>
      ) : (
        <path d="M30 27c6-7 24-9 34 1-4-2-9-3-9-3s-3 3-9 2-11-1-16 0Z" fill={palette.hair} />
      )}
      <circle cx="40" cy="43" r="2.6" fill={palette.hair} />
      <circle cx="56" cy="43" r="2.6" fill={palette.hair} />
      <path d="M41 52c3.5 3.5 10.5 3.5 14 0" stroke={palette.hair} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </>
  );
}

function YouthBust({ palette, gender }: { palette: Palette; gender: Gender }) {
  return (
    <>
      <path d="M14 96c0-20 15-31 34-31s34 11 34 31Z" fill={palette.garment} />
      {gender === "female" ? (
        <path d="M28 42a20 20 0 0 1 40 0v22c0 5-4 7-7 5V40H35v29c-3 2-7 0-7-5Z" fill={palette.hair} />
      ) : (
        <path d="M29 40a19 19 0 0 1 38 0c-5-9-12-12-19-12s-14 3-19 12Z" fill={palette.hair} />
      )}
      <circle cx="48" cy="41" r="17" fill={SKIN} />
      <path d="M31 38a17 17 0 0 1 34 0c-5-7-11-9-17-9s-12 2-17 9Z" fill={palette.hair} />
      <circle cx="42" cy="42" r="2" fill={palette.hair} />
      <circle cx="54" cy="42" r="2" fill={palette.hair} />
      <path d="M43 50c3 2.6 7 2.6 10 0" stroke={palette.hair} strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  );
}

function AdultBust({ palette, gender }: { palette: Palette; gender: Gender }) {
  return (
    <>
      <path d="M12 96c0-20 16-32 36-32s36 12 36 32Z" fill={palette.garment} />
      <path d="M48 64c6 0 11 1 15 3l-15 12-15-12c4-2 9-3 15-3Z" fill={palette.accent} opacity="0.9" />
      {gender === "female" ? (
        <path d="M29 40a19 19 0 0 1 38 0v20c0 6-5 9-8 6V38H37v28c-3 3-8 0-8-6Z" fill={palette.hair} />
      ) : (
        <path d="M30 39a18 18 0 0 1 36 0c-4-8-10-11-18-11s-14 3-18 11Z" fill={palette.hair} />
      )}
      <circle cx="48" cy="40" r="16" fill={SKIN} />
      <path d="M32 37a16 16 0 0 1 32 0c-5-6-10-8-16-8s-11 2-16 8Z" fill={palette.hair} />
      <circle cx="42.5" cy="41" r="1.9" fill={palette.hair} />
      <circle cx="53.5" cy="41" r="1.9" fill={palette.hair} />
      <path d="M44 48.5c2.5 2 5.5 2 8 0" stroke={palette.hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>
  );
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

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name}'s avatar`}
      className={cn("shrink-0 rounded-full border border-border/60 shadow-[var(--shadow-soft)]", className)}
    >
      <circle cx="48" cy="48" r="48" fill={palette.bg} />
      <g clipPath="url(#wazen-avatar-clip)">
        {lifeStage === "child" ? (
          <ChildFace palette={palette} gender={gender} />
        ) : lifeStage === "teenager" ? (
          <YouthBust palette={palette} gender={gender} />
        ) : (
          <AdultBust palette={palette} gender={gender} />
        )}
      </g>
      <defs>
        <clipPath id="wazen-avatar-clip">
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>
    </svg>
  );
}
