import { createServerSupabaseClient } from './server';
import { clerkClient } from '@clerk/nextjs';

export const syncUserToSupabase = async (clerkUserId: string) => {
  console.log('🔵 [Supabase Sync] Starting user sync:', { clerkUserId });
  
  try {
    console.log('🔵 [Supabase Sync] Creating Supabase client');
    const supabase = createServerSupabaseClient();
    
    console.log('🔵 [Supabase Sync] Fetching user from Clerk');
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    console.log('✅ [Supabase Sync] Got Clerk user:', {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName
    });

    const userData = {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
      image_url: clerkUser.imageUrl,
      updated_at: new Date().toISOString(),
    };

    console.log('🔵 [Supabase Sync] Upserting user data to Supabase:', userData);
    const { error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'id' });

    if (error) {
      console.error('🔴 [Supabase Sync] Error upserting user:', error);
      throw error;
    }

    console.log('✅ [Supabase Sync] Successfully synced user to Supabase');
    return { success: true };
  } catch (error) {
    console.error('🔴 [Supabase Sync] Error syncing user:', error);
    return { success: false, error };
  }
}; 