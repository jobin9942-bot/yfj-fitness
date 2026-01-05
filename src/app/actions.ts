'use server'

import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Save ALL user data to the cloud
export async function saveToCloud(userId: string, data: any) {
  try {
    await redis.set(`user:${userId}`, data);
    return { success: true };
  } catch (error) {
    console.error("Cloud Save Error:", error);
    return { success: false };
  }
}

// Load ALL user data from the cloud
export async function loadFromCloud(userId: string) {
  try {
    const data = await redis.get(`user:${userId}`);
    return data;
  } catch (error) {
    console.error("Cloud Load Error:", error);
    return null;
  }
}