import { createServerSupabaseClient } from './server';
import { clerkClient } from '@clerk/nextjs';

export const syncUserToSupabase = async (clerkUserId: string) => {
  try {
    const supabase = createServerSupabaseClient();
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    const userData = {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
      image_url: clerkUser.imageUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'id' });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error syncing user:', error);
    return { success: false, error };
  }
}; 