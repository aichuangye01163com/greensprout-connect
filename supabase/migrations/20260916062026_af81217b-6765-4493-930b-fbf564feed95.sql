ALTER TABLE public.activities
  ADD CONSTRAINT activities_host_id_profiles_fkey
  FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;