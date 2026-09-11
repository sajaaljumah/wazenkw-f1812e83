import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ICON_STROKE, RetryIcon, SavingsIcon } from "@/components/wazen/icons";
import { Feedback, LearnButton, LearnDialog, LearnProgressBar, useLearnCopy } from "./primitives";
import { useRecordActivity } from "@/hooks/use-wazen-learning";
import {
  BUDGET_ROUNDS,
  DIFFICULTY_LABEL,
  GOAL_CHOICES,
  NEEDS_WANTS_ITEMS,
  SHOPPER_PAIRS,
  gameMeta,
  missionQuestions,
  type Difficulty,
  type GameKey,
  type LearningProgress,
  type Text,
} from "@/lib/learning";
import { cn } from "@/lib/utils";

type GameProps = { level: Difficulty; onFinish: (score: number, max: number) => void };

const LEVELS: Difficulty[] = ["beginner", "intermediate", "advanced"];

/* ------------------------------------------------- 1. Needs or wants? */

function NeedsOrWants({ level, onFinish }: GameProps) {
  const { lc, s } = useLearnCopy();
  const items = useMemo(() => {
    const allowed: Difficulty[] =
      level === "beginner" ? ["beginner"] : level === "intermediate" ? ["beginner", "intermediate"] : ["intermediate", "advanced"];
    return NEEDS_WANTS_ITEMS.filter((item) => allowed.includes(item.level)).slice(0, 8);
  }, [level]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<"correct" | "wrong" | null>(null);

  const item = items[index];
  if (!item) return null;

  const answer = (asNeed: boolean) => {
    if (state) return;
    const right = asNeed === item.need;
    if (right) setScore((value) => value + 1);
    setState(right ? "correct" : "wrong");
    window.setTimeout(() => {
      if (index + 1 >= items.length) {
        onFinish(right ? score + 1 : score, items.length);
        return;
      }
      setIndex(index + 1);
      setState(null);
    }, 850);
  };

  return (
    <div className="space-y-5">
      <RoundHeader index={index} total={items.length} score={score} />
      <div className="flex min-h-28 items-center justify-center rounded-2xl bg-kid-tint p-6 text-center">
        <p className="text-lg sm:text-xl">{s(item.label)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LearnButton onClick={() => answer(true)} disabled={!!state}>
          {lc("need")}
        </LearnButton>
        <LearnButton variant="soft" onClick={() => answer(false)} disabled={!!state}>
          {lc("want")}
        </LearnButton>
      </div>
      <Feedback state={state} message={state === "correct" ? lc("correct") : lc("wrong")} />
    </div>
  );
}

/* -------------------------------------------------- 2. Build your budget */

function BuildYourBudget({ level, onFinish }: GameProps) {
  const { lc, s } = useLearnCopy();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<"correct" | "wrong" | null>(null);
  const [plan, setPlan] = useState({ needs: 0, save: 0, give: 0, fun: 0 });

  const bonus = level === "advanced" ? 1 : level === "intermediate" ? 0 : 0;
  const config = BUDGET_ROUNDS[Math.min(round, BUDGET_ROUNDS.length - 1)]!;
  const target = { ...config, minSave: config.minSave + bonus };
  const used = plan.needs + plan.save + plan.give + plan.fun;
  const left = target.money - used;

  const buckets: { key: keyof typeof plan; label: string }[] = [
    { key: "needs", label: lc("budgetNeeds") },
    { key: "save", label: lc("budgetSave") },
    { key: "give", label: lc("budgetGive") },
    { key: "fun", label: lc("budgetFun") },
  ];

  const check = () => {
    if (state) return;
    const ok =
      plan.needs >= target.needs && plan.save >= target.minSave && plan.give >= target.minGive && used <= target.money;
    if (ok) setScore((value) => value + 1);
    setState(ok ? "correct" : "wrong");
    window.setTimeout(() => {
      if (round + 1 >= BUDGET_ROUNDS.length) {
        onFinish(ok ? score + 1 : score, BUDGET_ROUNDS.length);
        return;
      }
      setRound(round + 1);
      setPlan({ needs: 0, save: 0, give: 0, fun: 0 });
      setState(null);
    }, 1100);
  };

  return (
    <div className="space-y-5">
      <RoundHeader index={round} total={BUDGET_ROUNDS.length} score={score} />
      <div className="rounded-2xl bg-kid-tint p-5">
        <p className="text-sm">{s(target.story)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {lc("budgetNeeds")} ≥ {target.needs} · {lc("budgetSave")} ≥ {target.minSave} · {lc("budgetGive")} ≥{" "}
          {target.minGive}
        </p>
      </div>

      <ul className="space-y-3">
        {buckets.map((bucket) => (
          <li
            key={bucket.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-kid-soft bg-card p-3"
          >
            <span className="min-w-0 truncate text-sm">{bucket.label}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`-1 ${bucket.label}`}
                className="kid-press size-9 rounded-full border border-kid-soft bg-kid-tint text-base"
                onClick={() => setPlan((value) => ({ ...value, [bucket.key]: Math.max(0, value[bucket.key] - 1) }))}
              >
                −
              </button>
              <span className="w-8 text-center tabular-nums">{plan[bucket.key]}</span>
              <button
                type="button"
                aria-label={`+1 ${bucket.label}`}
                className="kid-press size-9 rounded-full bg-kid-deep text-base text-kid-ivory"
                disabled={left <= 0}
                onClick={() =>
                  setPlan((value) => (left <= 0 ? value : { ...value, [bucket.key]: value[bucket.key] + 1 }))
                }
              >
                +
              </button>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">
        {lc("coinsLeft")}: <span className="tabular-nums text-foreground">{left}</span>
      </p>

      <LearnButton onClick={check} disabled={!!state}>
        <CheckIcon className="size-4" strokeWidth={ICON_STROKE} />
        {lc("submitPlan")}
      </LearnButton>
      <Feedback state={state} message={state === "correct" ? lc("correct") : lc("wrong")} />
    </div>
  );
}

/* --------------------------------------------------- 3. Save for your goal */

function SaveForGoal({ level, onFinish }: GameProps) {
  const { lc, s } = useLearnCopy();
  const weeks = 6;
  const target = level === "advanced" ? 16 : level === "intermediate" ? 13 : 10;
  const [week, setWeek] = useState(1);
  const [saved, setSaved] = useState(0);

  const choose = (amount: number) => {
    const total = saved + amount;
    if (week >= weeks || total >= target) {
      const score = total >= target ? weeks : Math.max(0, Math.round((total / target) * weeks));
      setSaved(total);
      onFinish(Math.min(score, weeks), weeks);
      return;
    }
    setSaved(total);
    setWeek(week + 1);
  };

  const percent = Math.min(100, (saved / target) * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-kid-tint p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {lc("week")} {week} {lc("stepOf")} {weeks}
          </span>
          <span className="tabular-nums">
            {lc("goalTarget")}: {target}
          </span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-lg tabular-nums">
          <SavingsIcon className="size-5 text-kid-deep" strokeWidth={ICON_STROKE} />
          {saved}
        </p>
        <LearnProgressBar percent={percent} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">{lc("savedSoFar")}</p>
      </div>

      <ul className="space-y-3">
        {GOAL_CHOICES.map((choice) => (
          <li key={choice.save}>
            <button
              type="button"
              onClick={() => choose(choice.save)}
              className="kid-press w-full rounded-2xl border border-kid-soft bg-card px-4 py-3 text-start text-sm hover:bg-kid-tint"
            >
              <span className="block">{s(choice.label)}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{s(choice.hint)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------- 4. Smart shopper */

function SmartShopper({ level, onFinish }: GameProps) {
  const { lc, s } = useLearnCopy();
  const pairs = useMemo(() => {
    const allowed: Difficulty[] =
      level === "beginner" ? ["beginner", "intermediate"] : level === "intermediate" ? ["intermediate", "beginner"] : ["advanced", "intermediate"];
    const picked = allowed.flatMap((d) => SHOPPER_PAIRS.filter((pair) => pair.level === d));
    return picked.slice(0, 6);
  }, [level]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const pair = pairs[index];
  if (!pair) return null;

  const answer = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    const right = option === pair.better;
    if (right) setScore((value) => value + 1);
    window.setTimeout(() => {
      if (index + 1 >= pairs.length) {
        onFinish(right ? score + 1 : score, pairs.length);
        return;
      }
      setIndex(index + 1);
      setPicked(null);
    }, 1200);
  };

  return (
    <div className="space-y-5">
      <RoundHeader index={index} total={pairs.length} score={score} />
      <p className="text-base sm:text-lg">{s(pair.question)}</p>
      <div className="grid gap-3">
        {pair.options.map((option: Text, optionIndex: number) => (
          <button
            key={optionIndex}
            type="button"
            onClick={() => answer(optionIndex)}
            disabled={picked !== null}
            className={cn(
              "kid-press rounded-2xl border px-4 py-3 text-start text-sm",
              picked === null
                ? "border-kid-soft bg-kid-tint hover:bg-kid-soft/60"
                : optionIndex === pair.better
                  ? "border-kid-mid bg-kid-soft/70"
                  : "border-border bg-card opacity-70",
            )}
          >
            {s(option)}
          </button>
        ))}
      </div>
      {picked !== null ? (
        <Feedback
          state={picked === pair.better ? "correct" : "wrong"}
          message={`${picked === pair.better ? lc("correct") : lc("wrong")} — ${s(pair.why)}`}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- 5. Money mission */

function MoneyMission({ level, onFinish }: GameProps) {
  const { lc, s } = useLearnCopy();
  const questions = useMemo(() => missionQuestions(level), [level]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(15);

  const question = questions[index];

  useEffect(() => {
    setSeconds(15);
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [index]);

  useEffect(() => {
    if (seconds > 0 || picked !== null) return;
    setPicked(-1);
    const timeout = window.setTimeout(() => {
      if (index + 1 >= questions.length) onFinish(score, questions.length);
      else {
        setIndex(index + 1);
        setPicked(null);
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [seconds, picked, index, questions.length, score, onFinish]);

  if (!question) return null;

  const answer = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    const right = option === question.answer;
    if (right) setScore((value) => value + 1);
    window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        onFinish(right ? score + 1 : score, questions.length);
        return;
      }
      setIndex(index + 1);
      setPicked(null);
    }, 950);
  };

  return (
    <div className="space-y-5">
      <RoundHeader index={index} total={questions.length} score={score} />
      <LearnProgressBar percent={(seconds / 15) * 100} tone="deep" />
      <p className="text-base sm:text-lg">{s(question.prompt)}</p>
      <div className="grid gap-3">
        {question.options.map((option, optionIndex) => (
          <button
            key={optionIndex}
            type="button"
            onClick={() => answer(optionIndex)}
            disabled={picked !== null}
            className={cn(
              "kid-press rounded-2xl border px-4 py-3 text-start text-sm",
              picked === null
                ? "border-kid-soft bg-kid-tint hover:bg-kid-soft/60"
                : optionIndex === question.answer
                  ? "border-kid-mid bg-kid-soft/70"
                  : "border-border bg-card opacity-70",
            )}
          >
            {s(option)}
          </button>
        ))}
      </div>
      {picked !== null ? (
        <Feedback
          state={picked === question.answer ? "correct" : "wrong"}
          message={`${picked === question.answer ? lc("correct") : lc("wrong")} — ${s(question.explain)}`}
        />
      ) : null}
    </div>
  );
}

function RoundHeader({ index, total, score }: { index: number; total: number; score: number }) {
  const { lc } = useLearnCopy();
  return (
    <div className="space-y-2">
      <LearnProgressBar percent={(index / total) * 100} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} {lc("stepOf")} {total}
        </span>
        <span className="tabular-nums">
          {lc("score")}: {score}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- game dialog */

const GAME_COMPONENT: Record<GameKey, (props: GameProps) => React.ReactNode> = {
  "needs-or-wants": NeedsOrWants,
  "build-your-budget": BuildYourBudget,
  "save-for-goal": SaveForGoal,
  "smart-shopper": SmartShopper,
  "money-mission": MoneyMission,
};

/** Instructions → gameplay → win/try-again, with progress saved on finish. */
export function GameDialog({
  gameKey,
  onClose,
  progress,
}: {
  gameKey: GameKey | null;
  onClose: () => void;
  progress: LearningProgress[];
}) {
  const { lc, s } = useLearnCopy();
  const record = useRecordActivity();
  const [level, setLevel] = useState<Difficulty>("beginner");
  const [phase, setPhase] = useState<"intro" | "play" | "result">("intro");
  const [result, setResult] = useState({ score: 0, max: 0 });
  const [round, setRound] = useState(0);

  const row = progress.find((item) => item.activity_type === "game" && item.activity_key === gameKey);

  useEffect(() => {
    if (!gameKey) return;
    setPhase("intro");
    setResult({ score: 0, max: 0 });
    const best = row && row.max_score > 0 ? row.best_score / row.max_score : 0;
    setLevel(best >= 0.85 ? "advanced" : best >= 0.6 ? "intermediate" : "beginner");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  if (!gameKey) return null;
  const meta = gameMeta(gameKey);
  const Game = GAME_COMPONENT[gameKey];

  const finish = (score: number, max: number) => {
    setResult({ score, max });
    setPhase("result");
    record.mutate({
      activity_type: "game",
      activity_key: gameKey,
      topic: meta.topic,
      score,
      max_score: max,
      completed: score >= Math.ceil(max * 0.7),
      difficulty: level,
      xp: score * 8,
    });
  };

  const won = result.max > 0 && result.score >= Math.ceil(result.max * 0.7);

  return (
    <LearnDialog open onClose={onClose} title={s(meta.title)} description={s(meta.summary)}>
      {phase === "intro" ? (
        <div className="space-y-5">
          <div className="rounded-2xl bg-kid-tint p-5">
            <p className="text-xs text-kid-deep">{lc("howToPlay")}</p>
            <p className="mt-2 text-sm">{s(meta.how)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{lc("difficulty")}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LEVELS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLevel(option)}
                  className={cn(
                    "kid-press min-h-10 rounded-xl border px-2 text-xs",
                    option === level ? "border-kid-mid bg-kid-soft/70 text-kid-deep" : "border-kid-soft bg-card",
                  )}
                >
                  {s(DIFFICULTY_LABEL[option])}
                </button>
              ))}
            </div>
          </div>
          {row ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {lc("bestScore")}: {row.best_score}/{row.max_score}
            </p>
          ) : null}
          <LearnButton
            onClick={() => {
              setRound((value) => value + 1);
              setPhase("play");
            }}
          >
            {lc("play")}
          </LearnButton>
        </div>
      ) : phase === "play" ? (
        <Game key={`${gameKey}-${level}-${round}`} level={level} onFinish={finish} />
      ) : (
        <div className="space-y-5 text-center">
          <p className="text-lg">{won ? lc("winTitle") : lc("tryAgainTitle")}</p>
          <p className="text-4xl tabular-nums">
            {result.score}/{result.max}
          </p>
          <p className="text-sm text-muted-foreground">{won ? lc("winBody") : lc("tryAgainBody")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <LearnButton
              onClick={() => {
                setRound((value) => value + 1);
                setPhase("play");
              }}
            >
              <RetryIcon className="size-4" strokeWidth={ICON_STROKE} />
              {lc("playAgain")}
            </LearnButton>
            <LearnButton variant="soft" onClick={onClose}>
              {lc("done")}
            </LearnButton>
          </div>
        </div>
      )}
    </LearnDialog>
  );
}
