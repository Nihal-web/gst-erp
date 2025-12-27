import { createClient } from '@supabase/supabase-js';

// Actually, let's keep it simple for now and not import types if they don't exist yet.

// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log("Initializing Supabase Client...", { supabaseUrl, hasKey: !!supabaseKey });


if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key in environment variables');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);
