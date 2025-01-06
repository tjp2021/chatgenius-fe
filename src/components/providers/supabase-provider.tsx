'use client';

import { createContext, useContext, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';

const SupabaseContext = createContext<ReturnType<typeof createClientSupabaseClient> | null>(null);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [supabase] = useState(() => createClientSupabaseClient());

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}; 