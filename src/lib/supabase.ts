import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  return (import.meta as any).env?.[key] || (process as any).env?.[key] || '';
};

const supabaseUrlInput = getEnv('VITE_SUPABASE_URL').trim();
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY').trim();

// Aggressive normalization: remove trailing slashes, spaces, and ensure it's a valid URL
const normalizeUrl = (url: string) => {
  if (!url) return '';
  let normalized = url.trim().replace(/\/+$/, '');
  if (normalized && !normalized.startsWith('http')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
};

const supabaseUrl = normalizeUrl(supabaseUrlInput);

// Create client only if keys are present and valid
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.includes('.')) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (input, init) => fetch(input, init)
      }
    })
  : null;
