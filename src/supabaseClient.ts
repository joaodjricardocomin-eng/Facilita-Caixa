import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://laiodtvrvtpxucpntoar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhaW9kdHZydnRweHVjcG50b2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjc1NDYsImV4cCI6MjA4MDkwMzU0Nn0.imApdpsmCQ6KSsOzTeiJ8buwdjMzi-FEfZfgMiRZXIY';

export const supabase = createClient(supabaseUrl, supabaseKey);