import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não foi definida.");
}

if (!key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não foi definida.");
}

export const supabase = createClient(url, key);