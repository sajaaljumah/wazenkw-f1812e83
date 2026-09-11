import { useMemo, useState } from "react";
import { CheckIcon, ICON_STROKE, RetryIcon } from "@/components/wazen/icons";
import { Feedback, LearnButton, LearnDialog, LearnProgressBar, useLearnCopy } from "./primitives";
import { useRecordActivity } from "@/hooks/use-wazen-learning";
import {
  DIFFICULTY_LABEL,
  buildQuiz,
  nextQuizDifficulty,
  weakTopics,
  type LearningProgress,
} from "@/lib/learning";

/**
 * Personalised quiz: difficulty follows previous results and questions lean on
 * the topics the child scored lowest in, so two quizzes never look identical.
 */
export function QuizDialog({
  open,
  onClose,
  progress,
  age,
}: {
  open: boolean;
  onClose: () => void;
  progress: LearningProgress[];
  age: number | null;
}) {
  const { lc, s } = useLearnCopy();
  const record = useRecordActivity();
  const difficulty = useMemo(() => nextQuizDifficulty(progress), [progress]);
  const questions = useMemo(
    () => buildQuiz({ difficulty, weak: weakTopics(progress), age }),
    [difficulty, progress, age],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];

  const answer = (option: number) => {
    if (picked !== null || !question) return;
    setPicked(option);
    if (option === question.answer) setScore((value) => value + 1);
  };

  const advance = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    setFinished(true);
    record.mutate({
      activity_type: "quiz",
      activity_key: `quiz-${difficulty}`,
      topic: question?.topic ?? "saving",
      score,
      max_score: questions.length,
      completed: score >= Math.ceil(questions.length * 0.6),
      difficulty,
      xp: score * 10,
    });
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const close = () => {
    restart();
    onClose();
  };

  if (!open) return null;

  return (
    <LearnDialog
      open={open}
      onClose={close}
      title={lc("quiz")}
      description={`${lc("quizIntro")} · ${lc("difficulty")}: ${s(DIFFICULTY_LABEL[difficulty])}`}
    >
      {finished || !question ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-muted-foreground">{lc("yourResult")}</p>
          <p className="text-4xl tabular-nums">
            {score}/{questions.length}
          </p>
          <p className="text-sm">{score >= questions.length / 2 ? lc("winBody") : lc("tryAgainBody")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <LearnButton onClick={restart}>
              <RetryIcon className="size-4" strokeWidth={ICON_STROKE} />
              {lc("playAgain")}
            </LearnButton>
            <LearnButton variant="soft" onClick={close}>
              {lc("done")}
            </LearnButton>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <LearnProgressBar percent={((index + (picked === null ? 0 : 1)) / questions.length) * 100} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {lc("question")} {index + 1} {lc("stepOf")} {questions.length}
              </span>
              <span className="tabular-nums">
                {lc("score")}: {score}
              </span>
            </div>
          </div>

          <p className="text-base sm:text-lg">{s(question.prompt)}</p>

          <ul className="space-y-3">
            {question.options.map((option, optionIndex) => {
              const isAnswer = optionIndex === question.answer;
              const chosen = picked === optionIndex;
              return (
                <li key={optionIndex}>
                  <button
                    type="button"
                    onClick={() => answer(optionIndex)}
                    disabled={picked !== null}
                    className={[
                      "kid-press w-full rounded-2xl border px-4 py-3 text-start text-sm transition-colors",
                      picked === null
                        ? "border-kid-soft bg-kid-tint hover:bg-kid-soft/60"
                        : isAnswer
                          ? "border-kid-mid bg-kid-soft/70"
                          : chosen
                            ? "border-border bg-secondary/60"
                            : "border-border bg-card opacity-70",
                    ].join(" ")}
                  >
                    {s(option)}
                  </button>
                </li>
              );
            })}
          </ul>

          {picked !== null ? (
            <>
              <Feedback
                state={picked === question.answer ? "correct" : "wrong"}
                message={`${picked === question.answer ? lc("correct") : lc("wrong")} — ${s(question.explain)}`}
              />
              <LearnButton onClick={advance}>
                {index + 1 < questions.length ? lc("next") : lc("finish")}
                <CheckIcon className="size-4" strokeWidth={ICON_STROKE} />
              </LearnButton>
            </>
          ) : null}
        </div>
      )}
    </LearnDialog>
  );
}
