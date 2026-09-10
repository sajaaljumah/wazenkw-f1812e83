import { cn } from "@/lib/utils";

/**
 * Hand-drawn style SVG illustrations for the child experience.
 * All colours come from the child palette tokens, so they follow the
 * female / male pastel theme automatically.
 */

type IllustrationProps = { className?: string };

const soft = "var(--color-kid-soft)";
const mid = "var(--color-kid-mid)";
const deep = "var(--color-kid-deep)";
const champagne = "var(--color-kid-champagne)";
const ivory = "var(--color-kid-ivory)";

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={cn("size-full", className)} role="presentation" aria-hidden="true">
      {children}
    </svg>
  );
}

export function SavingsJarIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <rect x="34" y="42" width="52" height="54" rx="18" fill={ivory} stroke={mid} strokeWidth="3" />
      <rect x="42" y="32" width="36" height="12" rx="6" fill={mid} />
      <rect x="52" y="52" width="16" height="4" rx="2" fill={deep} opacity="0.5" />
      <circle cx="50" cy="72" r="7" fill={champagne} />
      <circle cx="68" cy="78" r="9" fill={champagne} opacity="0.85" />
      <circle cx="58" cy="88" r="6" fill={champagne} opacity="0.6" />
      <path d="M92 34c2 4 6 5 6 5s-4 1-6 5c-2-4-6-5-6-5s4-1 6-5z" fill={champagne} />
    </Frame>
  );
}

export function BicycleIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <circle cx="40" cy="80" r="16" fill="none" stroke={deep} strokeWidth="4" />
      <circle cx="84" cy="80" r="16" fill="none" stroke={deep} strokeWidth="4" />
      <path d="M40 80l14-26h18l12 26" fill="none" stroke={mid} strokeWidth="4" strokeLinecap="round" />
      <path d="M54 54h22" stroke={mid} strokeWidth="4" strokeLinecap="round" />
      <path d="M74 54l6-14h8" stroke={champagne} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="80" r="4" fill={champagne} />
    </Frame>
  );
}

export function ToyIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <circle cx="60" cy="56" r="24" fill={ivory} stroke={mid} strokeWidth="3" />
      <circle cx="38" cy="40" r="10" fill={mid} />
      <circle cx="82" cy="40" r="10" fill={mid} />
      <circle cx="52" cy="52" r="3" fill={deep} />
      <circle cx="68" cy="52" r="3" fill={deep} />
      <path d="M52 64c3 4 13 4 16 0" stroke={deep} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M44 86h32" stroke={champagne} strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function TravelIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <path d="M26 70l62-30-14 34-12-6-6 14-4-16z" fill={ivory} stroke={mid} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 88c10-6 22-6 32 0" stroke={champagne} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="90" cy="30" r="5" fill={champagne} />
    </Frame>
  );
}

export function BookIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <path d="M28 40h26c4 0 6 3 6 6v42c0-4-2-6-6-6H28z" fill={ivory} stroke={mid} strokeWidth="3" />
      <path d="M92 40H66c-4 0-6 3-6 6v42c0-4 2-6 6-6h26z" fill={ivory} stroke={mid} strokeWidth="3" />
      <path d="M60 34c2 4 6 5 6 5s-4 1-6 5c-2-4-6-5-6-5s4-1 6-5z" fill={champagne} />
    </Frame>
  );
}

export function GiftIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <rect x="32" y="52" width="56" height="40" rx="10" fill={ivory} stroke={mid} strokeWidth="3" />
      <rect x="28" y="42" width="64" height="14" rx="7" fill={mid} />
      <path d="M60 42V92" stroke={champagne} strokeWidth="5" />
      <path d="M60 42c-8-14-22-8-16 0zM60 42c8-14 22-8 16 0z" fill={champagne} />
    </Frame>
  );
}

export function HeartIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <path
        d="M60 92S28 74 28 52c0-11 9-18 18-18 6 0 11 3 14 8 3-5 8-8 14-8 9 0 18 7 18 18 0 22-32 40-32 40z"
        fill={ivory}
        stroke={mid}
        strokeWidth="3"
      />
      <circle cx="60" cy="58" r="7" fill={champagne} />
    </Frame>
  );
}

export function CoinIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <circle cx="60" cy="62" r="26" fill={champagne} />
      <circle cx="60" cy="62" r="18" fill={ivory} opacity="0.7" />
      <path d="M60 52v20M54 58h12M54 66h12" stroke={deep} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function StarBadgeIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <circle cx="60" cy="60" r="52" fill={soft} opacity="0.55" />
      <path
        d="M60 26l10 22 24 3-17 17 4 24-21-12-21 12 4-24-17-17 24-3z"
        fill={champagne}
        stroke={mid}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

export type GoalIllustration = (props: IllustrationProps) => JSX.Element;

/** Picks a friendly illustration from the goal's own name — no new data needed. */
export function illustrationForGoal(name: string): GoalIllustration {
  const value = name.toLowerCase();
  if (/bike|bicycle|cycle|scooter|skate/.test(value)) return BicycleIllustration;
  if (/toy|lego|game|doll|console|playstation|puzzle|robot/.test(value)) return ToyIllustration;
  if (/trip|travel|holiday|umrah|flight|camp|beach|visit/.test(value)) return TravelIllustration;
  if (/book|school|course|learn|read/.test(value)) return BookIllustration;
  if (/gift|present|birthday|eid/.test(value)) return GiftIllustration;
  if (/give|charity|sadaqah|donat|help/.test(value)) return HeartIllustration;
  if (/phone|tablet|watch|headphone|bag|shoe/.test(value)) return CoinIllustration;
  return SavingsJarIllustration;
}

/** Small decorative sparkles / hearts / coins scattered behind a section. */
export function KidDecorations({ className }: IllustrationProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <svg className="absolute right-5 top-5 size-6 kid-twinkle" viewBox="0 0 24 24">
        <path d="M12 2l2.2 6.2L20 10l-5.8 1.8L12 18l-2.2-6.2L4 10l5.8-1.8z" fill={champagne} />
      </svg>
      <svg className="absolute right-16 top-16 size-4 kid-twinkle" viewBox="0 0 24 24" style={{ animationDelay: "700ms" }}>
        <circle cx="12" cy="12" r="10" fill={mid} opacity="0.7" />
      </svg>
      <svg className="absolute bottom-6 right-10 size-5 kid-float" viewBox="0 0 24 24">
        <path d="M12 21S3 15 3 9.5C3 6.5 5.4 5 7.5 5c1.7 0 3.2 1 4.5 2.6C13.3 6 14.8 5 16.5 5 18.6 5 21 6.5 21 9.5 21 15 12 21 12 21z" fill={soft} />
      </svg>
      <svg className="absolute left-6 bottom-8 size-4 kid-twinkle" viewBox="0 0 24 24" style={{ animationDelay: "1200ms" }}>
        <path d="M12 2l2.2 6.2L20 10l-5.8 1.8L12 18l-2.2-6.2L4 10l5.8-1.8z" fill={mid} />
      </svg>
    </div>
  );
}

/** Gentle one-off confetti burst for a real milestone. */
export function Celebration({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 18 });
  const colors = [champagne, mid, soft, deep];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden="true">
      {pieces.map((_, index) => (
        <span
          key={index}
          className="kid-confetti-piece absolute top-0 block size-2 rounded-full"
          style={{
            left: `${(index * 5.5 + 4) % 96}%`,
            backgroundColor: colors[index % colors.length],
            animationDelay: `${(index % 6) * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}
