CREATE TABLE IF NOT EXISTS public.learning_profiles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_profiles TO authenticated;
GRANT ALL ON public.learning_profiles TO service_role;
ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own learning profile" ON public.learning_profiles;
CREATE POLICY "Users manage their own learning profile" ON public.learning_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS learning_profiles_touch_updated_at ON public.learning_profiles;
CREATE TRIGGER learning_profiles_touch_updated_at
  BEFORE UPDATE ON public.learning_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.learning_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_key text NOT NULL,
  topic text,
  status text NOT NULL DEFAULT 'in_progress',
  score integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  difficulty text,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_progress_type_check CHECK (activity_type IN ('lesson','game','quiz')),
  CONSTRAINT learning_progress_status_check CHECK (status IN ('in_progress','completed')),
  CONSTRAINT learning_progress_unique UNIQUE (user_id, activity_type, activity_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own learning progress" ON public.learning_progress;
CREATE POLICY "Users manage their own learning progress" ON public.learning_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS learning_progress_user_idx ON public.learning_progress (user_id, activity_type);
DROP TRIGGER IF EXISTS learning_progress_touch_updated_at ON public.learning_progress;
CREATE TRIGGER learning_progress_touch_updated_at
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.learning_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  challenge_key text NOT NULL,
  target_days integer NOT NULL DEFAULT 7,
  days_completed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  started_on date NOT NULL DEFAULT current_date,
  last_checkin_on date,
  completed_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_challenges_status_check CHECK (status IN ('active','completed')),
  CONSTRAINT learning_challenges_unique UNIQUE (user_id, challenge_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_challenges TO authenticated;
GRANT ALL ON public.learning_challenges TO service_role;
ALTER TABLE public.learning_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own learning challenges" ON public.learning_challenges;
CREATE POLICY "Users manage their own learning challenges" ON public.learning_challenges
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS learning_challenges_user_idx ON public.learning_challenges (user_id, status);
DROP TRIGGER IF EXISTS learning_challenges_touch_updated_at ON public.learning_challenges;
CREATE TRIGGER learning_challenges_touch_updated_at
  BEFORE UPDATE ON public.learning_challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realistic demo learning activity for the seeded child accounts
INSERT INTO public.learning_profiles (user_id, xp, current_streak, longest_streak, last_activity_on)
SELECT u.id, 340, 5, 9, current_date
FROM auth.users u WHERE u.email = 'layan@wazen.app'
ON CONFLICT (user_id) DO UPDATE SET xp = EXCLUDED.xp, current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak, last_activity_on = EXCLUDED.last_activity_on;

INSERT INTO public.learning_profiles (user_id, xp, current_streak, longest_streak, last_activity_on)
SELECT u.id, 180, 2, 4, current_date - 1
FROM auth.users u WHERE u.email = 'abdulrahman@wazen.app'
ON CONFLICT (user_id) DO UPDATE SET xp = EXCLUDED.xp, current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak, last_activity_on = EXCLUDED.last_activity_on;

INSERT INTO public.learning_progress (user_id, activity_type, activity_key, topic, status, score, best_score, max_score, attempts, difficulty, last_activity_at)
SELECT u.id, v.activity_type, v.activity_key, v.topic, v.status, v.score, v.best_score, v.max_score, v.attempts, v.difficulty, now() - (v.days_ago || ' days')::interval
FROM auth.users u
CROSS JOIN (VALUES
  ('lesson','needs-wants','needs_wants','completed',100,100,100,1,NULL,6),
  ('lesson','how-to-save','saving','completed',100,100,100,1,NULL,4),
  ('lesson','smart-spending','spending','completed',100,100,100,1,NULL,2),
  ('game','needs-or-wants','needs_wants','completed',8,9,10,3,'beginner',3),
  ('game','save-for-goal','goals','completed',6,7,10,2,'beginner',2),
  ('game','smart-shopper','spending','in_progress',4,4,10,1,'beginner',1),
  ('quiz','quiz-beginner','saving','completed',4,5,6,2,'beginner',1)
) AS v(activity_type, activity_key, topic, status, score, best_score, max_score, attempts, difficulty, days_ago)
WHERE u.email = 'layan@wazen.app'
ON CONFLICT (user_id, activity_type, activity_key) DO NOTHING;

INSERT INTO public.learning_progress (user_id, activity_type, activity_key, topic, status, score, best_score, max_score, attempts, difficulty, last_activity_at)
SELECT u.id, v.activity_type, v.activity_key, v.topic, v.status, v.score, v.best_score, v.max_score, v.attempts, v.difficulty, now() - (v.days_ago || ' days')::interval
FROM auth.users u
CROSS JOIN (VALUES
  ('lesson','needs-wants','needs_wants','completed',100,100,100,1,NULL,5),
  ('game','needs-or-wants','needs_wants','completed',7,7,10,1,'beginner',3),
  ('quiz','quiz-beginner','needs_wants','completed',3,3,6,1,'beginner',2)
) AS v(activity_type, activity_key, topic, status, score, best_score, max_score, attempts, difficulty, days_ago)
WHERE u.email = 'abdulrahman@wazen.app'
ON CONFLICT (user_id, activity_type, activity_key) DO NOTHING;

INSERT INTO public.learning_challenges (user_id, challenge_key, target_days, days_completed, status, started_on, last_checkin_on, completed_on)
SELECT u.id, v.challenge_key, v.target_days, v.days_completed, v.status, current_date - v.started_ago, current_date - v.checkin_ago,
  CASE WHEN v.status = 'completed' THEN current_date - v.checkin_ago ELSE NULL END
FROM auth.users u
CROSS JOIN (VALUES
  ('save-7-days',7,4,'active',4,1),
  ('no-extra-buying',5,5,'completed',20,15)
) AS v(challenge_key, target_days, days_completed, status, started_ago, checkin_ago)
WHERE u.email = 'layan@wazen.app'
ON CONFLICT (user_id, challenge_key) DO NOTHING;

INSERT INTO public.learning_challenges (user_id, challenge_key, target_days, days_completed, status, started_on, last_checkin_on)
SELECT u.id, 'save-7-days', 7, 2, 'active', current_date - 2, current_date - 1
FROM auth.users u WHERE u.email = 'abdulrahman@wazen.app'
ON CONFLICT (user_id, challenge_key) DO NOTHING;