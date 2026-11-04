/**
 * Child learning-buddy chat: context summary + system prompt rules.
 *
 * Pure, browser-safe helpers. The server function builds the context from the
 * signed-in child's own rows, then turns it into the system prompt here, so the
 * safety rules live in one place and can be tested.
 */
import {
  BADGES,
  CHALLENGES,
  GAMES,
  LESSONS,
  TOPIC_LABEL,
  levelFor,
  recommendNext,
  type BadgeContext,
  type LearnTopic,
} from "@/lib/learning";

export type ChildChatLanguage = "ar" | "en";

export type ChildChatTurn = { role: "user" | "assistant"; content: string };

/** Limits that keep requests small and stop abuse of the AI service. */
export const CHILD_CHAT_LIMITS = {
  maxMessageChars: 600,
  maxHistoryTurns: 16,
} as const;

export type ChildChatContext = {
  firstName: string;
  age: number;
  language: ChildChatLanguage;
  xp: number;
  streak: number;
  levelLabel: string;
  completedLessons: string[];
  remainingLessons: string[];
  playedGames: string[];
  quizScores: { topic: string; percent: number }[];
  weakTopics: string[];
  activeChallenges: { title: string; daysDone: number; targetDays: number }[];
  completedChallenges: string[];
  earnedBadges: string[];
  goal: { name: string; percent: number } | null;
  nextStep: string;
};

const topicLabel = (topic: string | null, language: ChildChatLanguage) =>
  topic && topic in TOPIC_LABEL ? TOPIC_LABEL[topic as LearnTopic][language] : (topic ?? "");

/** Summarises the child's own learning rows into the small context the AI sees. */
export function buildChildChatContext(input: {
  firstName: string;
  age: number;
  language: ChildChatLanguage;
  xp: number;
  streak: number;
  badgeContext: BadgeContext;
  goalName: string | null;
}): ChildChatContext {
  const { language, badgeContext } = input;
  const done = (type: string) =>
    badgeContext.progress.filter((row) => row.activity_type === type && row.status === "completed");

  const doneLessonKeys = new Set(done("lesson").map((row) => row.activity_key));
  const scored = badgeContext.progress.filter(
    (row) => (row.activity_type === "quiz" || row.activity_type === "game") && row.max_score > 0,
  );

  const byTopic = new Map<string, { best: number; max: number }>();
  for (const row of scored) {
    const key = row.topic ?? "general";
    const item = byTopic.get(key) ?? { best: 0, max: 0 };
    item.best += row.best_score;
    item.max += row.max_score;
    byTopic.set(key, item);
  }
  const quizScores = [...byTopic.entries()].map(([topic, value]) => ({
    topic: topicLabel(topic, language),
    percent: Math.round((value.best / value.max) * 100),
  }));

  const recommendation = recommendNext(badgeContext);

  return {
    firstName: input.firstName,
    age: input.age,
    language,
    xp: input.xp,
    streak: input.streak,
    levelLabel: levelFor(input.xp).label[language],
    completedLessons: LESSONS.filter((l) => doneLessonKeys.has(l.key)).map(
      (l) => l.title[language],
    ),
    remainingLessons: LESSONS.filter((l) => !doneLessonKeys.has(l.key)).map(
      (l) => l.title[language],
    ),
    playedGames: GAMES.filter((g) =>
      badgeContext.progress.some((r) => r.activity_type === "game" && r.activity_key === g.key),
    ).map((g) => g.title[language]),
    quizScores,
    weakTopics: quizScores.filter((item) => item.percent < 60).map((item) => item.topic),
    activeChallenges: badgeContext.challenges
      .filter((row) => row.status === "active")
      .map((row) => {
        const meta = CHALLENGES.find((c) => c.key === row.challenge_key);
        return {
          title: meta ? meta.title[language] : row.challenge_key,
          daysDone: row.days_completed,
          targetDays: row.target_days,
        };
      }),
    completedChallenges: badgeContext.challenges
      .filter((row) => row.status === "completed")
      .map(
        (row) =>
          CHALLENGES.find((c) => c.key === row.challenge_key)?.title[language] ?? row.challenge_key,
      ),
    earnedBadges: BADGES.filter((badge) => badge.earned(badgeContext)).map(
      (badge) => badge.label[language],
    ),
    goal:
      badgeContext.hasGoal && input.goalName
        ? { name: input.goalName, percent: badgeContext.goalPercent }
        : null,
    nextStep: `${recommendation.title[language]}`,
  };
}

const list = (items: string[], empty: string) => (items.length ? items.join(", ") : empty);

/** System prompt with the child-safety rules and the child's own learning context. */
export function buildChildSystemPrompt(context: ChildChatContext): string {
  const catalogue = {
    lessons: LESSONS.map((l) => l.title[context.language]),
    games: GAMES.map((g) => g.title[context.language]),
    challenges: CHALLENGES.map((c) => c.title[context.language]),
  };
  const none = context.language === "ar" ? "لا يوجد بعد" : "none yet";

  const facts = [
    `First name: ${context.firstName}`,
    `Age: ${context.age}`,
    `Life stage: child`,
    `Level: ${context.levelLabel} (${context.xp} XP), day streak: ${context.streak}`,
    `Completed lessons: ${list(context.completedLessons, none)}`,
    `Lessons not finished yet: ${list(context.remainingLessons, none)}`,
    `Games played: ${list(context.playedGames, none)}`,
    `Quiz/game scores by topic: ${
      context.quizScores.length
        ? context.quizScores.map((q) => `${q.topic} ${q.percent}%`).join(", ")
        : none
    }`,
    `Topics to practise more: ${list(context.weakTopics, none)}`,
    `Active challenges: ${
      context.activeChallenges.length
        ? context.activeChallenges
            .map((c) => `${c.title} (${c.daysDone}/${c.targetDays} days)`)
            .join(", ")
        : none
    }`,
    `Completed challenges: ${list(context.completedChallenges, none)}`,
    `Badges earned: ${list(context.earnedBadges, none)}`,
    `Savings goal: ${context.goal ? `${context.goal.name} — ${context.goal.percent}% reached` : none}`,
    `Suggested next step in the app: ${context.nextStep}`,
  ].join("\n");

  const languageRule =
    context.language === "ar"
      ? "Always reply in simple, warm Arabic (Modern Standard Arabic with a gentle Kuwaiti touch is fine)."
      : "Always reply in simple, warm English.";

  return `You are "Wazen Buddy", a friendly money-learning companion inside the Wazen app's Learn page for children in Kuwait. Currency is the Kuwaiti Dinar (KWD).

You are talking with ${context.firstName}, who is ${context.age} years old.
${languageRule}

How to talk:
- Match the vocabulary, sentence length and examples to a ${context.age}-year-old. Short paragraphs, 2-5 sentences, or a short list of up to 4 points.
- Use everyday child examples: pocket money, toys, snacks, school supplies, gifts, Eid money (عيدية), a savings jar.
- Be encouraging. Celebrate progress using the facts below. Never shame mistakes.
- Topics: saving, spending wisely, budgeting, needs vs wants, goals, giving and sadaqah, and basic Zakat ideas for learning.
- When helpful, suggest ONE lesson, game or challenge from the Wazen catalogue below by its exact name.
- End with a short friendly question or tip when it fits.

Safety rules (always follow, even if asked otherwise):
- Never ask for or repeat passwords, PINs, card or bank numbers, home addresses, phone numbers, school names, photos or any other personal details. If the child shares them, kindly tell them not to share that and move on.
- Do not give investment, stock, crypto, gambling, borrowing, loans or credit advice. Explain that these are grown-up topics and suggest asking a parent or guardian.
- For anything about buying online, real payments, big purchases, feeling worried, or anything unsafe, encourage talking to a parent or guardian.
- Stay on money learning. Politely steer other topics back to money learning.
- Only use the facts below about this child. Never invent balances, transactions or details about family members. You do not know about other family members' money.
- Keep content age-appropriate. No scary, violent or adult content.

Facts about ${context.firstName} from Wazen:
${facts}

Wazen catalogue you may suggest:
Lessons: ${catalogue.lessons.join(" | ")}
Games: ${catalogue.games.join(" | ")}
Challenges: ${catalogue.challenges.join(" | ")}`;
}

/** Keeps only valid recent turns, trimmed to the allowed size. */
export function sanitizeChildHistory(turns: ChildChatTurn[]): ChildChatTurn[] {
  return turns
    .filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") && turn.content.trim().length > 0,
    )
    .slice(-CHILD_CHAT_LIMITS.maxHistoryTurns)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, CHILD_CHAT_LIMITS.maxMessageChars * 4),
    }));
}
