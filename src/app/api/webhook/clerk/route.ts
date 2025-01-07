import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { env } from "@/env.mjs";

const BACKEND_API_URL = env.BACKEND_API_URL;

async function syncWithBackend(endpoint: string, data: any, method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  try {
    const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BACKEND_API_KEY}`, // You'll need to add this to your env variables
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Backend sync failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error syncing with backend:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  
  try {
    switch (eventType) {
      case "user.created": {
        const { id, email_addresses, username, first_name, last_name } = evt.data;
        await syncWithBackend('/users', {
          clerkId: id,
          email: email_addresses[0]?.email_address,
          username,
          firstName: first_name,
          lastName: last_name,
        });
        break;
      }
      
      case "user.updated": {
        const { id, email_addresses, username, first_name, last_name } = evt.data;
        await syncWithBackend(`/users/${id}`, {
          email: email_addresses[0]?.email_address,
          username,
          firstName: first_name,
          lastName: last_name,
        }, 'PUT');
        break;
      }
      
      case "user.deleted": {
        const { id } = evt.data;
        await syncWithBackend(`/users/${id}`, {}, 'DELETE');
        break;
      }

      // Session events
      case "session.created":
      case "session.ended":
      case "session.removed": {
        const { id, user_id } = evt.data;
        console.log(`Session ${id} for user ${user_id} was ${eventType.split('.')[1]}`);
        break;
      }

      // Organization events
      case "organization.created":
      case "organization.updated": {
        const { id, name } = evt.data;
        console.log(`Organization ${id} (${name}) was ${eventType.split('.')[1]}`);
        break;
      }

      case "organization.deleted": {
        const { id } = evt.data;
        console.log(`Organization ${id} was deleted`);
        break;
      }

      // Organization membership events
      case "organizationMembership.created":
      case "organizationMembership.updated":
      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;
        console.log(
          `Membership for user ${public_user_data.user_id} in org ${organization.id} was ${
            eventType.split('.')[1]
          }`
        );
        break;
      }
    }

    return new Response("Webhook processed and synced with backend", { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response("Error processing webhook", { status: 500 });
  }
} 