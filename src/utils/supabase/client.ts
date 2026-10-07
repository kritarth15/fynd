import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://avrwlgwcfsgfmflesstd.supabase.co";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_X_i2Ay_GQG2jGD9xh3LRGQ_hAlvaFmW";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

export const supabase = createClient();
