import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

const webhookSecret = process.env.WEBHOOK_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const payload = await req.json();
  const headersList = headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  // If there is no webhook secret, throw error
  if (!webhookSecret) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Create a new SVIX instance with your webhook secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(JSON.stringify(payload), {
      "svix-id": svix_id!,
      "svix-timestamp": svix_timestamp!,
      "svix-signature": svix_signature!,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  const eventType = evt.type;
  console.log('Received webhook event:', {
    type: eventType,
    userId: evt.data.id,
    email: evt.data.email_addresses?.[0]?.email_address
  });

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { 
      id,
      email_addresses,
      image_url,
      username,
      first_name,
      last_name,
      created_at,
      updated_at,
      external_accounts
    } = evt.data;

    console.log('Syncing full user data to Supabase:', {
      id,
      email: email_addresses[0]?.email_address,
      username,
      firstName: first_name,
      lastName: last_name
    });

    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        email: email_addresses[0]?.email_address,
        username: username || email_addresses[0]?.email_address?.split('@')[0],
        first_name,
        last_name,
        full_name: `${first_name || ''} ${last_name || ''}`.trim(),
        image_url,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_online: true,
        // Add any other profile data you want to sync
        external_accounts: external_accounts || [],
        email_verified: email_addresses[0]?.verification?.status === 'verified'
      }, {
        onConflict: 'id',
        // Update all fields on conflict
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Supabase sync error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Successfully synced full user data to Supabase:', { id });
  }

  return new Response('Success', { status: 200 });
} 