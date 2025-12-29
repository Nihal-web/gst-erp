import { createClient } from '@supabase/supabase-js';

// Actually, let's keep it simple for now and not import types if they don't exist yet.

// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Support both naming conventions for compatibility
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

console.log("Initializing Supabase Client...", {
    url: supabaseUrl ? "Present" : "Missing",
    key: supabaseKey ? "Present" : "Missing"
});


if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase Configuration Missing: Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);
