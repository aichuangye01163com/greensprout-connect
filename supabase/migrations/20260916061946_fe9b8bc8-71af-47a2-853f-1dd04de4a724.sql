CREATE TABLE public.activity_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_categories TO anon;
GRANT SELECT ON public.activity_categories TO authenticated;
GRANT ALL ON public.activity_categories TO service_role;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active categories" ON public.activity_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);

INSERT INTO public.activity_categories (name, slug) VALUES
  ('运动', 'sports'),
  ('约饭', 'dining'),
  ('兴趣', 'hobbies'),
  ('户外', 'outdoor'),
  ('桌游', 'games'),
  ('学习', 'learning'),
  ('其他', 'other');

CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.activity_categories(id),
  cover TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  district TEXT,
  participant_limit INT NOT NULL DEFAULT 6,
  fee NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC NOT NULL DEFAULT 0,
  agenda JSONB NOT NULL DEFAULT '[]',
  eligibility JSONB,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  is_private BOOLEAN NOT NULL DEFAULT false,
  room_password TEXT,
  invite_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view activities" ON public.activities
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can create their own activities" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their own activities" ON public.activities
  FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their own activities" ON public.activities
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TABLE public.activity_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_members TO authenticated;
GRANT ALL ON public.activity_members TO service_role;
ALTER TABLE public.activity_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members are visible to signed-in users" ON public.activity_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join activities" ON public.activity_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own membership" ON public.activity_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_host_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_members (activity_id, user_id, status)
  VALUES (NEW.id, NEW.host_id, 'active')
  ON CONFLICT (activity_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.add_host_as_member() FROM anon, authenticated, public;
CREATE TRIGGER on_activity_created AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.add_host_as_member();