
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rghmxgutlbvzrfztxvaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaG14Z3V0bGJ2enJmenR4dmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTU1MDcsImV4cCI6MjA4MTEzMTUwN30.ONdIMXYCppU53M869ENsePw3okULdbuaVv3qkKjiTiM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
