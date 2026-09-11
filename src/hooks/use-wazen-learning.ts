import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-wazen-auth";
import type {
  ActivityType,
  Difficulty,
  LearningChallenge,
  LearningProfile,
  LearningProgress,
} from "@/lib/learning";

const today = () => new Date().toISOString().slice(0, 10);

export function useLearningProfile() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["learning-profile", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<LearningProfile | null> => {
      const { data, error } = await supabase
        .from("learning_profiles")
        .select("user_id, xp, current_streak, longest_streak, last_activity_on")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LearningProfile | null;
    },
  });
}

export function useLearningProgress() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["learning-progress", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<LearningProgress[]> => {
      const { data, error } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_activity_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LearningProgress[];
    },
  });
}

export function useLearningChallenges() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["learning-challenges", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<LearningChallenge[]> => {
      const { data, error } = await supabase
        .from("learning_challenges")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LearningChallenge[];
    },
  });
}

function useInvalidateLearning() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["learning-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["learning-progress"] }),
      queryClient.invalidateQueries({ queryKey: ["learning-challenges"] }),
    ]);
  };
}

/** XP and the day streak are kept in one small profile row. */
async function addXp(userId: string, xp: number) {
  const { data } = await supabase
    .from("learning_profiles")
    .select("xp, current_streak, longest_streak, last_activity_on")
    .eq("user_id", userId)
    .maybeSingle();

  const day = today();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const previous = (data ?? null) as LearningProfile | null;
  const streak =
    previous?.last_activity_on === day
      ? previous.current_streak
      : previous?.last_activity_on === yesterday
        ? previous.current_streak + 1
        : 1;

  const row = {
    user_id: userId,
    xp: (previous?.xp ?? 0) + xp,
    current_streak: streak,
    longest_streak: Math.max(streak, previous?.longest_streak ?? 0),
    last_activity_on: day,
  };
  const { error } = await supabase.from("learning_profiles").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

export type ActivityResult = {
  activity_type: ActivityType;
  activity_key: string;
  topic: string;
  score: number;
  max_score: number;
  completed: boolean;
  difficulty?: Difficulty | undefined;
  xp: number;
};

/** Records a lesson, game or quiz result and keeps the best score. */
export function useRecordActivity() {
  const { user } = useSession();
  const invalidate = useInvalidateLearning();
  return useMutation({
    mutationFn: async (result: ActivityResult) => {
      const userId = user!.id;
      const { data: existing } = await supabase
        .from("learning_progress")
        .select("id, best_score, attempts, status")
        .eq("user_id", userId)
        .eq("activity_type", result.activity_type)
        .eq("activity_key", result.activity_key)
        .maybeSingle();

      const previous = existing as { id: string; best_score: number; attempts: number; status: string } | null;
      const row = {
        user_id: userId,
        activity_type: result.activity_type,
        activity_key: result.activity_key,
        topic: result.topic,
        status: (result.completed || previous?.status === "completed" ? "completed" : "in_progress") as
          | "completed"
          | "in_progress",
        score: result.score,
        best_score: Math.max(result.score, previous?.best_score ?? 0),
        max_score: result.max_score,
        attempts: (previous?.attempts ?? 0) + 1,
        difficulty: result.difficulty ?? null,
        last_activity_at: new Date().toISOString(),
      };

      if (previous) {
        const { error } = await supabase.from("learning_progress").update(row).eq("id", previous.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("learning_progress").insert(row);
        if (error) throw error;
      }

      const firstTime = !previous || previous.status !== "completed";
      if (result.xp > 0 && (firstTime || result.completed)) await addXp(userId, result.xp);
    },
    onSuccess: invalidate,
  });
}

export function useStartChallenge() {
  const { user } = useSession();
  const invalidate = useInvalidateLearning();
  return useMutation({
    mutationFn: async ({ key, targetDays }: { key: string; targetDays: number }) => {
      const { error } = await supabase.from("learning_challenges").upsert(
        {
          user_id: user!.id,
          challenge_key: key,
          target_days: targetDays,
          days_completed: 0,
          status: "active" as const,
          started_on: today(),
          last_checkin_on: null,
          completed_on: null,
        },
        { onConflict: "user_id,challenge_key" },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** One check-in per day; finishing the target completes the challenge. */
export function useCheckInChallenge() {
  const { user } = useSession();
  const invalidate = useInvalidateLearning();
  return useMutation({
    mutationFn: async (challenge: LearningChallenge) => {
      const day = today();
      if (challenge.last_checkin_on === day || challenge.status === "completed") return;
      const days = Math.min(challenge.days_completed + 1, challenge.target_days);
      const finished = days >= challenge.target_days;
      const { error } = await supabase
        .from("learning_challenges")
        .update({
          days_completed: days,
          last_checkin_on: day,
          status: finished ? "completed" : "active",
          completed_on: finished ? day : null,
        })
        .eq("id", challenge.id);
      if (error) throw error;
      await addXp(user!.id, finished ? 40 : 10);
    },
    onSuccess: invalidate,
  });
}
