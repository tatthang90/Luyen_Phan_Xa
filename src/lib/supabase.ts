import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Thiếu cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
