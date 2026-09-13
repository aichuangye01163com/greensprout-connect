import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type Profile = {
  id: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
};
