import { createClient } from '@supabase/supabase-js';

// Paste your Supabase Project URL and Public (Anon / Publishable) Key below:
const SUPABASE_URL = 'https://wftacwdxzwllsswaaaoa.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_RFVYaOeZbr05nRVodSB4aA_qs7Gyy7g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
