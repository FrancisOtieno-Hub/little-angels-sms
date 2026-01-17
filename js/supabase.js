import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://jddphdeflisqwtqqujox.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZHBoZGVmbGlzcXd0cXF1am94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTc5NDksImV4cCI6MjA4NDE5Mzk0OX0.gUFTDCq6VSyPydK4Ll7xjqY8HEi1EvNXvUMwjAr73FA";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
