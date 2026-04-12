import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://oaftqweofrifoiuwntce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZnRxd2VvZnJpZm9pdXdudGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTA3MTMsImV4cCI6MjA4OTg4NjcxM30.GOPl-QrAYzekiH3i3DENywHXP-2x7BSLFqObdl6lLJs'
);
