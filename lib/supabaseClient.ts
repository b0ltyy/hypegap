import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 🔥 dit is de belangrijkste fix voor OAuth callbacks met #access_token
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
