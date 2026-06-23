import { createClient } from "@supabase/supabase-js";

// Public by design: the publishable key lives in the browser. The
// camp_application table is insert-only for anon (no read access via this
// key), so the worst a visitor can do is submit an application.
const SUPABASE_URL = "https://xfyijkztkhfkuffmjqwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A7d4oGNXwTaH8vIx7Jl94Q_D_dD6uFE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
