CREATE TYPE public.gender_type AS ENUM ('female','male');
CREATE TYPE public.life_stage_type AS ENUM ('child','teenager','university_student','employee','self_employed','parent');
CREATE TYPE public.account_type AS ENUM ('independent','dependent','parent');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender public.gender_type NOT NULL,
  life_stage public.life_stage_type NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','ar')),
  base_currency TEXT NOT NULL DEFAULT 'KWD' CHECK (char_length(base_currency) = 3),
  account_type public.account_type NOT NULL DEFAULT 'independent',
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'guardian' CHECK (relationship_type IN ('mother','father','guardian')),
  permissions JSONB NOT NULL DEFAULT '{"can_monitor": true, "can_fund": false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT family_relationships_unique_pair UNIQUE (parent_user_id, child_user_id),
  CONSTRAINT family_relationships_no_self CHECK (parent_user_id <> child_user_id)
);

CREATE INDEX family_relationships_parent_idx ON public.family_relationships(parent_user_id);
CREATE INDEX family_relationships_child_idx ON public.family_relationships(child_user_id);

-- Age is always derived, never stored
CREATE OR REPLACE FUNCTION public.calculate_age(dob DATE)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT date_part('year', age(dob))::int $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER family_relationships_set_updated_at BEFORE UPDATE ON public.family_relationships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Immutable identity fields: gender and date of birth
CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    RAISE EXCEPTION 'Date of birth cannot be changed after account creation';
  END IF;
  IF NEW.gender IS DISTINCT FROM OLD.gender THEN
    RAISE EXCEPTION 'Gender cannot be changed after account creation';
  END IF;
  NEW.id = OLD.id;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_protect_identity BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

-- Security definer helper so parent policies never recurse into profiles RLS
CREATE OR REPLACE FUNCTION public.is_guardian_of(_parent UUID, _child UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_relationships
    WHERE parent_user_id = _parent AND child_user_id = _child AND status = 'active'
  )
$$;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.family_relationships TO authenticated;
GRANT ALL ON public.family_relationships TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Guardians can read linked child profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_guardian_of(auth.uid(), id));

CREATE POLICY "Users can create own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Family members can read own relationships" ON public.family_relationships
FOR SELECT TO authenticated USING (parent_user_id = auth.uid() OR child_user_id = auth.uid());