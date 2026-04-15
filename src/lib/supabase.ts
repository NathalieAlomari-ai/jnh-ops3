import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

// Using untyped client here for TS 6.0 compatibility with hand-crafted types.
// Replace with createClient<Database>(...) after running: supabase gen types typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
