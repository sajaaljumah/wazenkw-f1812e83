import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/wazen/AppShell";
import {
  ChallengesIcon,
  CheckIcon,
  ForwardIcon,
  GameIcon,
  ICON_STROKE,
  LearnIcon,
  LockedIcon,
  QuizIcon,
  RecommendIcon,
  RewardsIcon,
  SpinnerIcon,
  StreakIcon,
} from "@/components/wazen/icons";
import {
  LearnButton,
  LearnProgressBar,
  LearnSection,
  LearnStat,
  useLearnCopy,
} from "@/components/wazen/learn/primitives";
import { LessonDialog } from "@/components/wazen/learn/LessonDialog";
import { QuizDialog } from "@/components/wazen/learn/QuizDialog";
import { GameDialog } from "@/components/wazen/learn/games";
import { StarBadgeIllustration } from "@/components/wazen/dashboard/child/illustrations";
import { useProfile } from "@/hooks/use-wazen-auth";
import { useGoals, useTransactions } from "@/hooks/use-wazen-finance";
import {
  useCheckInChallenge,
  useLearningChallenges,
  useLearningProfile,
  useLearningProgress,
  useStartChallenge,
} from "@/hooks/use-wazen-learning";
import {
  BADGES,
  CHALLENGES,
  DIFFICULTY_LABEL,
  GAMES,
  LESSONS,
  challengeMeta,
  levelFor,
  nextQuizDifficulty,
  recommendNext,
  type BadgeContext,
  type GameKey,
  type Lesson,
} from "@/lib/learning";
import { calculateAge } from "@/lib/wazen";
import { savedForGoal, totalsFor } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Wazen" },
      {
        name: "description",
        content: "Wazen's child money school: short lessons, playable games, quizzes, challenges and badges.",
      },
      { property: "og:title", content: "Learn — Wazen" },
      {
        property: "og:description",
        content: "Short financial lessons, real games, quizzes and challenges for children.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const navigate = useNavigate();
  const { lc, s } = useLearnCopy();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const progress = useLearningProgress();
  const learning = useLearningProfile();
  const challenges = useLearningChallenges();
  const transactions = useTransactions();
  const goals = useGoals();
  const startChallenge = useStartChallenge();
  const checkIn = useCheckInChallenge();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [game, setGame] = useState<GameKey | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  // Learning is part of the child experience.
  useEffect(() => {
    if (profile && profile.life_stage !== "child") navigate({ to: "/dashboard" });
  }, [profile, navigate]);

  const rows = progress.data ?? [];
  const challengeRows = challenges.data ?? [];

  const context: BadgeContext = useMemo(() => {
    const list = transactions.data ?? [];
    const goal = (goals.data ?? []).find((item) => item.kind === "goal") ?? null;
    const saved = goal ? savedForGoal(list, goal.id) : 0;
    const target = goal ? Number(goal.target_amount) : 0;
    return {
      progress: rows,
      challenges: challengeRows,
      totalSaved: totalsFor(list).savings,
      goalPercent: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
      hasGoal: !!goal,
    };
  }, [rows, challengeRows, transactions.data, goals.data]);

  const loading =
    profileLoading || progress.isLoading || learning.isLoading || challenges.isLoading || transactions.isLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const doneLessons = rows.filter((row) => row.activity_type === "lesson" && row.status === "completed");
  const lessonPercent = Math.round((doneLessons.length / LESSONS.length) * 100);
  const xp = learning.data?.xp ?? 0;
  const level = levelFor(xp);
  const earnedBadges = BADGES.filter((badge) => badge.earned(context));
  const recommendation = recommendNext(context);
  const quizLevel = nextQuizDifficulty(rows);
  const today = new Date().toISOString().slice(0, 10);
  const age = profile ? calculateAge(profile.date_of_birth) : null;

  const openRecommendation = () => {
    if (recommendation.kind === "lesson") {
      setLesson(LESSONS.find((item) => item.key === recommendation.key) ?? null);
      return;
    }
    if (recommendation.kind === "game") {
      setGame(recommendation.key as GameKey);
      return;
    }
    if (recommendation.kind === "quiz") {
      setQuizOpen(true);
      return;
    }
    if (recommendation.kind === "challenge") {
      const meta = challengeMeta(recommendation.key);
      if (meta) startChallenge.mutate({ key: meta.key, targetDays: meta.targetDays });
      return;
    }
    document.getElementById("learn-achievements")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppShell>
      <div className="kid-theme space-y-8 wazen-enter">
        {/* Hero + recommendation */}
        <section className="kid-panel relative overflow-hidden bg-kid-tint p-6 sm:p-9">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs text-kid-deep">
                <LearnIcon className="size-4" strokeWidth={ICON_STROKE} />
                {lc("learn")}
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl">{lc("pageTitle")}</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{lc("pageIntro")}</p>
            </div>
            <span className="hidden size-20 shrink-0 kid-float sm:block">
              <StarBadgeIllustration />
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-kid-soft bg-card p-4 sm:p-5">
            <p className="flex items-center gap-2 text-xs text-kid-deep">
              <RecommendIcon className="size-4" strokeWidth={ICON_STROKE} />
              {lc("nextUp")}
            </p>
            <div className="mt-3 grid gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_auto] min-[420px]:items-center">
              <div className="min-w-0">
                <p className="text-base sm:text-lg">{s(recommendation.title)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s(recommendation.reason)}</p>
              </div>
              <LearnButton onClick={openRecommendation}>
                {lc("start")}
                <ForwardIcon className="size-4 rtl:rotate-180" strokeWidth={ICON_STROKE} />
              </LearnButton>
            </div>
          </div>
        </section>

        {/* A. Learning progress */}
        <LearnSection title={lc("progressTitle")} caption={lc("progressCaption")} icon={<LearnIcon className="size-4" strokeWidth={ICON_STROKE} />}>
          <div className="kid-panel space-y-4 p-5 sm:p-6">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>{lc("overall")}</span>
                <span className="tabular-nums text-muted-foreground">{lessonPercent}%</span>
              </div>
              <LearnProgressBar percent={lessonPercent} className="mt-3" />
            </div>
            <div className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <LearnStat
                label={lc("lessonsDone")}
                value={`${doneLessons.length}/${LESSONS.length}`}
              />
              <LearnStat label={lc("level")} value={s(level.label)} hint={`${xp} XP`} />
              <LearnStat
                label={lc("streak")}
                value={String(learning.data?.current_streak ?? 0)}
              />
              <LearnStat label={lc("badgesEarned")} value={`${earnedBadges.length}/${BADGES.length}`} />
            </div>
            {level.nextAt ? (
              <div>
                <LearnProgressBar percent={level.percentToNext} tone="deep" />
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {Math.max(0, level.nextAt - xp)} XP {lc("xpToNext")}
                </p>
              </div>
            ) : null}
          </div>
        </LearnSection>

        {/* B. Lessons */}
        <LearnSection title={lc("lessons")} caption={lc("lessonsCaption")} icon={<LearnIcon className="size-4" strokeWidth={ICON_STROKE} />}>
          <ul className="grid gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3">
            {LESSONS.map((item) => {
              const done = doneLessons.some((row) => row.activity_key === item.key);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setLesson(item)}
                    className="kid-panel kid-press flex h-full w-full flex-col gap-2 p-5 text-start"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-kid-soft/70 px-3 py-1 text-[0.7rem] text-kid-deep">
                        {item.minutes} {lc("minutes")}
                      </span>
                      {done ? (
                        <span className="flex items-center gap-1 text-[0.7rem] text-kid-deep">
                          <CheckIcon className="size-3.5" strokeWidth={ICON_STROKE} />
                          {lc("completedTag")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-base sm:text-lg">{s(item.title)}</span>
                    <span className="text-xs text-muted-foreground">{s(item.summary)}</span>
                    <span className="mt-auto pt-3 text-xs text-kid-deep">
                      {done ? lc("reviewAgain") : lc("start")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </LearnSection>

        {/* C. Games */}
        <LearnSection collapsible defaultOpen title={lc("games")} caption={lc("gamesCaption")} icon={<GameIcon className="size-4" strokeWidth={ICON_STROKE} />}>
          <ul className="grid gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3">
            {GAMES.map((item) => {
              const row = rows.find((entry) => entry.activity_type === "game" && entry.activity_key === item.key);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setGame(item.key)}
                    className="kid-panel kid-press flex h-full w-full flex-col gap-2 bg-kid-tint p-5 text-start"
                  >
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-kid-soft/80 text-kid-deep">
                      <GameIcon className="size-5" strokeWidth={ICON_STROKE} />
                    </span>
                    <span className="mt-1 text-base sm:text-lg">{s(item.title)}</span>
                    <span className="text-xs text-muted-foreground">{s(item.summary)}</span>
                    <span className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-kid-deep">
                      <span>{row ? lc("playAgain") : lc("play")}</span>
                      {row && row.max_score > 0 ? (
                        <span className="tabular-nums text-muted-foreground">
                          {lc("bestScore")}: {row.best_score}/{row.max_score}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </LearnSection>

        {/* D. Quiz */}
        <LearnSection collapsible defaultOpen title={lc("quiz")} caption={lc("quizCaption")} icon={<QuizIcon className="size-4" strokeWidth={ICON_STROKE} />}>
          <div className="kid-panel grid gap-4 p-5 sm:p-6 min-[420px]:grid-cols-[minmax(0,1fr)_auto] min-[420px]:items-center">
            <div className="min-w-0">
              <p className="text-sm">{lc("quizIntro")}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {lc("difficulty")}: {s(DIFFICULTY_LABEL[quizLevel])}
              </p>
            </div>
            <LearnButton onClick={() => setQuizOpen(true)}>{lc("startQuiz")}</LearnButton>
          </div>
        </LearnSection>

        {/* E. Challenges */}
        <LearnSection collapsible defaultOpen title={lc("challenges")} caption={lc("challengesCaption")} icon={<ChallengesIcon className="size-4" strokeWidth={ICON_STROKE} />}>
          <ul className="grid gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3">
            {CHALLENGES.map((meta) => {
              const row = challengeRows.find((entry) => entry.challenge_key === meta.key);
              const days = row?.days_completed ?? 0;
              const percent = Math.round((days / meta.targetDays) * 100);
              const done = row?.status === "completed";
              const checkedToday = row?.last_checkin_on === today;
              return (
                <li key={meta.key} className="kid-panel flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-base">{s(meta.title)}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-[0.7rem]",
                        done ? "bg-kid-soft/70 text-kid-deep" : row ? "bg-secondary/70" : "bg-kid-tint text-kid-deep",
                      )}
                    >
                      {done ? lc("challengeComplete") : row ? lc("active") : lc("startChallenge")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s(meta.description)}</p>
                  <LearnProgressBar percent={percent} />
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {days} {lc("daysDone")} · {Math.max(0, meta.targetDays - days)} {lc("daysLeft")}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-kid-deep">
                    <RewardsIcon className="size-4" strokeWidth={ICON_STROKE} />
                    {lc("reward")}: {s(meta.reward)}
                  </p>
                  <div className="mt-auto pt-1">
                    {!row ? (
                      <LearnButton
                        variant="soft"
                        onClick={() => startChallenge.mutate({ key: meta.key, targetDays: meta.targetDays })}
                        disabled={startChallenge.isPending}
                      >
                        {lc("startChallenge")}
                      </LearnButton>
                    ) : done ? (
                      <p className="flex items-center gap-2 text-xs text-kid-deep">
                        <CheckIcon className="size-4" strokeWidth={ICON_STROKE} />
                        {lc("challengeComplete")}
                      </p>
                    ) : (
                      <LearnButton
                        onClick={() => checkIn.mutate(row)}
                        disabled={checkedToday || checkIn.isPending}
                      >
                        <StreakIcon className="size-4" strokeWidth={ICON_STROKE} />
                        {checkedToday ? lc("checkedInToday") : lc("checkIn")}
                      </LearnButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </LearnSection>

        {/* F. Achievements */}
        <div id="learn-achievements">
          <LearnSection
            collapsible
            defaultOpen
            title={lc("achievements")}
            caption={lc("lockedNote")}
            icon={<RewardsIcon className="size-4" strokeWidth={ICON_STROKE} />}
          >
            <ul className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 lg:grid-cols-4">
              {BADGES.map((badge) => {
                const earned = badge.earned(context);
                return (
                  <li
                    key={badge.key}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-3xl border p-4 text-center transition-[border-color,box-shadow,transform] duration-200",
                      earned ? "kid-earned border-kid-soft bg-kid-soft/50 kid-pop" : "border-border bg-card",
                    )}
                  >
                    <span className={cn("size-12", earned ? "" : "opacity-45")}>
                      <StarBadgeIllustration />
                    </span>
                    <span className="text-xs">{s(badge.label)}</span>
                    <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                      {earned ? (
                        <>
                          <CheckIcon className="size-3" strokeWidth={ICON_STROKE} />
                          {lc("earned")}
                        </>
                      ) : (
                        <>
                          <LockedIcon className="size-3" strokeWidth={ICON_STROKE} />
                          {lc("locked")}
                        </>
                      )}
                    </span>
                    <span className="text-[0.7rem] text-muted-foreground">{s(badge.hint)}</span>
                  </li>
                );
              })}
            </ul>
          </LearnSection>
        </div>
      </div>

      <LessonDialog
        lesson={lesson}
        onClose={() => setLesson(null)}
        alreadyDone={!!lesson && doneLessons.some((row) => row.activity_key === lesson.key)}
      />
      <GameDialog gameKey={game} onClose={() => setGame(null)} progress={rows} />
      <QuizDialog open={quizOpen} onClose={() => setQuizOpen(false)} progress={rows} age={age} />
    </AppShell>
  );
}
