import { useEffect, useState } from "react";
import { CheckIcon, ForwardIcon, ICON_STROKE } from "@/components/wazen/icons";
import { LearnButton, LearnDialog, LearnProgressBar, useLearnCopy } from "./primitives";
import type { Lesson } from "@/lib/learning";
import { useRecordActivity } from "@/hooks/use-wazen-learning";

/** Short, stepped lesson — one idea per screen instead of a wall of text. */
export function LessonDialog({
  lesson,
  onClose,
  alreadyDone,
}: {
  lesson: Lesson | null;
  onClose: () => void;
  alreadyDone: boolean;
}) {
  const { lc, s } = useLearnCopy();
  const record = useRecordActivity();
  const [step, setStep] = useState(0);

  useEffect(() => setStep(0), [lesson?.key]);

  // Close only once the save has settled, so the dialog is never unmounted
  // from inside a mutation callback (which updates state after unmount).
  const settled = record.isSuccess || record.isError;
  useEffect(() => {
    if (settled) onClose();
  }, [settled, onClose]);

  if (!lesson) return null;
  const total = lesson.steps.length + 1;
  const isTakeaway = step === lesson.steps.length;
  const current = lesson.steps[Math.min(step, lesson.steps.length - 1)]!;

  const finish = () => {
    record.mutate(
      {
        activity_type: "lesson",
        activity_key: lesson.key,
        topic: lesson.topic,
        score: 100,
        max_score: 100,
        completed: true,
        xp: alreadyDone ? 0 : lesson.xp,
      },
      { onSuccess: onClose, onError: onClose },
    );
  };

  return (
    <LearnDialog open onClose={onClose} title={s(lesson.title)} description={s(lesson.summary)}>
      <div className="space-y-5">
        <div className="space-y-2">
          <LearnProgressBar percent={((step + 1) / total) * 100} />
          <p className="text-xs text-muted-foreground">
            {step + 1} {lc("stepOf")} {total}
          </p>
        </div>

        {lesson.topic === "zakat" ? (
          <p className="rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
            {lc("zakatNote")}
          </p>
        ) : null}

        {isTakeaway ? (
          <div className="rounded-2xl bg-kid-tint p-5">
            <p className="text-xs text-kid-deep">{lc("takeaway")}</p>
            <p className="mt-2 text-base sm:text-lg">{s(lesson.takeaway)}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-kid-tint p-5">
            <p className="text-base sm:text-lg">{s(current.title)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s(current.body)}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isTakeaway ? (
            <LearnButton onClick={finish} disabled={record.isPending}>
              <CheckIcon className="size-4" strokeWidth={ICON_STROKE} />
              {record.isPending ? lc("saving") : lc("markComplete")}
            </LearnButton>
          ) : (
            <LearnButton onClick={() => setStep((value) => value + 1)}>
              {lc("next")}
              <ForwardIcon className="size-4 rtl:rotate-180" strokeWidth={ICON_STROKE} />
            </LearnButton>
          )}
          <LearnButton variant="soft" onClick={onClose}>
            {lc("close")}
          </LearnButton>
        </div>
      </div>
    </LearnDialog>
  );
}
