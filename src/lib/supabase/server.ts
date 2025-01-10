import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createServerSupabaseClient = () => {
  console.log('🔵 [Supabase Server] Creating server client');
  const cookieStore = cookies();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('🔴 [Supabase Server] Missing NEXT_PUBLIC_SUPABASE_URL');
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('🔴 [Supabase Server] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  console.log('🔵 [Supabase Server] Creating client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.error('🔴 [Supabase Server] Error setting cookie:', error);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.error('🔴 [Supabase Server] Error removing cookie:', error);
          }
        },
      },
    }
  );

  console.log('✅ [Supabase Server] Successfully created server client');
  return client;
}; 