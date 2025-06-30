import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vliaxbacgyiqpliqedhg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsaWF4YmFjZ3lpcXBsaXFlZGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzOTMzNDAsImV4cCI6MjA2MTk2OTM0MH0.DyTyIS4o8VrtgHGqIkpZ64iRtq74woejLgCd6AxU1zs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);