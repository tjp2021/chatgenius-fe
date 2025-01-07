import { auth } from '@clerk/nextjs';

export async function getAuthToken(): Promise<string | null> {
  try {
    const { getToken } = auth();
    return getToken ? getToken({ template: "default" }) : null;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}