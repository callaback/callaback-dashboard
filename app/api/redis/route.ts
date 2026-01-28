import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// Create Redis client with your connection URL
const getRedisClient = async () => {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://default:DqoEYx1yY8wCrVY3FL6dZjMCzgKneDAx@redis-16020.c99.us-east-1-4.ec2.cloud.redislabs.com:16020'
  });

  client.on('error', (err) => console.error('Redis Client Error', err));
  
  await client.connect();
  return client;
};

export const POST = async () => {
  let redis;
  
  try {
    // Connect to Redis
    redis = await getRedisClient();
    
    // Fetch data from Redis
    const result = await redis.get("item");
    
    // Return the result in the response
    return NextResponse.json({ 
      success: true,
      result 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Redis error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
    
  } finally {
    // Close connection
    if (redis) {
      await redis.quit();
    }
  }
};

export const GET = async () => {
  let redis;
  
  try {
    // Connect to Redis
    redis = await getRedisClient();
    
    // Fetch data from Redis
    const result = await redis.get("item");
    
    // Return the result in the response
    return NextResponse.json({ 
      success: true,
      result 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Redis error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
    
  } finally {
    // Close connection
    if (redis) {
      await redis.quit();
    }
  }
};
